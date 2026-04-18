const functions = require('firebase-functions');
const express = require('express');
const app = require('./server/index');

// Export the Express app as a Firebase Function
exports.app = functions.https.onRequest(app);
