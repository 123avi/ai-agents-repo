/**
 * Main application entry point
 * Initializes Express server and configures middleware
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Placeholder middleware configuration
app.use(express.json());

/**
 * Health check endpoint
 * @route GET /health
 * @returns {object} Server health status
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Start the Express server
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;