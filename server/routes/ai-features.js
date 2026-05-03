const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// ─────────────────────────────────────────────
// IMAGE GENERATION - Multiple Providers with Fallback
// ─────────────────────────────────────────────
router.post('/generate-image', async (req, res) => {
  const { prompt, size = '1024x1024', quality = 'standard' } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Try providers in order: Together AI (free) -> OpenAI (paid) -> Pollinations (free backup)
  
  // 1. Try Together AI (FLUX.1 - Best free option)
  if (process.env.TOGETHER_API_KEY && process.env.TOGETHER_API_KEY !== 'your-together-api-key-here') {
    try {
      console.log('Generating image with Together AI (FLUX.1)');
      console.log(`Prompt: ${prompt}`);
      
      const response = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'black-forest-labs/FLUX.1-schnell-Free',
          prompt: prompt,
          width: 1024,
          height: 1024,
          steps: 4,
          n: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.data[0].url;
        
        // Fetch and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.buffer();
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64Image}`;

        console.log('Image generated successfully with Together AI');
        return res.json({
          success: true,
          imageUrl: dataUrl,
          originalUrl: imageUrl,
          prompt: prompt,
          model: 'FLUX.1-schnell',
          provider: 'Together AI',
        });
      }
    } catch (err) {
      console.log('Together AI failed, trying next provider:', err.message);
    }
  }

  // 2. Try OpenAI DALL-E 3 (if available and has credits)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    try {
      console.log('Generating image with OpenAI DALL-E 3');
      console.log(`Prompt: ${prompt}`);
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: size,
          quality: quality,
          response_format: 'url',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.data[0].url;
        const revisedPrompt = data.data[0].revised_prompt;

        // Fetch and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.buffer();
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64Image}`;

        console.log('Image generated successfully with DALL-E 3');
        return res.json({
          success: true,
          imageUrl: dataUrl,
          originalUrl: imageUrl,
          prompt: prompt,
          revisedPrompt: revisedPrompt,
          model: 'dall-e-3',
          provider: 'OpenAI',
        });
      } else {
        const error = await response.json();
        console.log('OpenAI failed:', error.error?.message);
      }
    } catch (err) {
      console.log('OpenAI failed, trying next provider:', err.message);
    }
  }

  // 3. Fallback to Pollinations.ai (Always free, no API key)
  try {
    console.log('Generating image with Pollinations.ai (free fallback)');
    console.log(`Prompt: ${prompt}`);
    
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true`;
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const imageBuffer = await response.buffer();
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log('Image generated successfully with Pollinations.ai');
    return res.json({
      success: true,
      imageUrl: dataUrl,
      prompt: prompt,
      model: 'pollinations-ai',
      provider: 'Pollinations.ai',
    });

  } catch (err) {
    console.error('All image generation providers failed:', err);
    return res.status(500).json({ 
      error: 'Failed to generate image',
      message: 'All providers failed. Please try again later or add an API key.',
      detail: err.message 
    });
  }
});

// Get available models
router.get('/image-models', (req, res) => {
  const models = [];
  
  if (process.env.TOGETHER_API_KEY && process.env.TOGETHER_API_KEY !== 'your-together-api-key-here') {
    models.push({
      id: 'flux-schnell',
      name: 'FLUX.1 Schnell',
      description: 'Fast, high quality (Free with Together AI)',
      provider: 'Together AI',
    });
  }
  
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    models.push({
      id: 'dall-e-3',
      name: 'DALL-E 3',
      description: 'Best quality, most creative (OpenAI)',
      provider: 'OpenAI',
    });
  }
  
  // Always available
  models.push({
    id: 'pollinations-ai',
    name: 'Pollinations AI',
    description: 'Free, no API key needed',
    provider: 'Pollinations.ai',
  });
  
  res.json(models);
});

// ─────────────────────────────────────────────
// IMAGE GENERATION - Multiple Providers with Fallback
// ─────────────────────────────────────────────