const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// ─────────────────────────────────────────────
// IMAGE GENERATION - Pollinations.ai (Free, No API Key)
// ─────────────────────────────────────────────
router.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    console.log(`Generating image with Pollinations.ai`);
    console.log(`Prompt: ${prompt}`);
    
    // Pollinations.ai provides free image generation without API keys
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;
    
    console.log(`Fetching image from: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error(`Pollinations error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: 'Failed to generate image',
        detail: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    // Get image as buffer
    const imageBuffer = await response.buffer();
    console.log(`Image generated successfully, size: ${imageBuffer.length} bytes`);
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    res.json({
      success: true,
      imageUrl: dataUrl,
      prompt,
      model: 'pollinations-ai',
    });

  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ 
      error: 'Failed to generate image',
      message: err.message 
    });
  }
});

// Get available models
router.get('/image-models', (req, res) => {
  const models = [
    {
      id: 'pollinations-ai',
      name: 'Pollinations AI',
      description: 'Free, fast, high quality',
    },
  ];
  
  res.json(models);
});

// ─────────────────────────────────────────────
// WEB SEARCH - Google Custom Search
// ─────────────────────────────────────────────
router.post('/web-search', async (req, res) => {
  const { query, num } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  if (!process.env.GOOGLE_SEARCH_KEY || !process.env.GOOGLE_SEARCH_CX) {
    return res.status(503).json({ 
      error: 'Web search not configured. Please add GOOGLE_SEARCH_KEY and GOOGLE_SEARCH_CX to .env file' 
    });
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.append('key', process.env.GOOGLE_SEARCH_KEY);
    searchUrl.searchParams.append('cx', process.env.GOOGLE_SEARCH_CX);
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('num', num || 5);

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Google Search error:', error);
      return res.status(response.status).json({ 
        error: 'Search failed',
        detail: error.error?.message || 'Unknown error'
      });
    }

    const data = await response.json();
    
    // Format results
    const results = (data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      image: item.pagemap?.cse_image?.[0]?.src || null,
    }));

    res.json({
      success: true,
      query,
      totalResults: data.searchInformation?.totalResults || 0,
      searchTime: data.searchInformation?.searchTime || 0,
      results,
    });

  } catch (err) {
    console.error('Web search error:', err);
    res.status(500).json({ 
      error: 'Search failed',
      message: err.message 
    });
  }
});

// Search and summarize with AI
router.post('/search-and-summarize', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  if (!process.env.GOOGLE_SEARCH_KEY || !process.env.GOOGLE_SEARCH_CX) {
    return res.status(503).json({ 
      error: 'Web search not configured. Please add GOOGLE_SEARCH_KEY and GOOGLE_SEARCH_CX to .env file' 
    });
  }

  try {
    // First, perform web search
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.append('key', process.env.GOOGLE_SEARCH_KEY);
    searchUrl.searchParams.append('cx', process.env.GOOGLE_SEARCH_CX);
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('num', 5);

    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      throw new Error('Search failed');
    }

    const searchData = await searchResponse.json();
    const results = (searchData.items || []).slice(0, 5);

    // Format search results for AI
    const searchContext = results.map((item, idx) => 
      `[${idx + 1}] ${item.title}\n${item.snippet}\nSource: ${item.link}`
    ).join('\n\n');

    // Send to AI for summarization
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes web search results. Provide a clear, concise answer based on the search results. Always cite sources using [1], [2], etc.'
          },
          {
            role: 'user',
            content: `Question: ${query}\n\nSearch Results:\n${searchContext}\n\nPlease provide a comprehensive answer based on these search results, citing sources.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI summarization failed');
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    res.json({
      success: true,
      query,
      summary,
      sources: results.map(r => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
      })),
    });

  } catch (err) {
    console.error('Search and summarize error:', err);
    res.status(500).json({ 
      error: 'Failed to search and summarize',
      message: err.message 
    });
  }
});

module.exports = router;
