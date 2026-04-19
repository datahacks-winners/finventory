import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Mock inventory data - same as the Firebase function
const MOCK_INVENTORY = [
  {
    itemId: 'listing_001',
    itemType: 'listing',
    content: 'Pacific Bluefin Tuna - A grade, 500 lb available from Pacific Seafood Co in Seattle, WA at $12.50/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_001',
    similarity: 0.95,
    metadata: { species: 'Bluefin Tuna', grade: 'A', quantity: '500 lb', location: 'Seattle, WA', seller: 'Pacific Seafood Co', price: 12.50 }
  },
  {
    itemId: 'listing_002',
    itemType: 'listing',
    content: 'Yellowfin Tuna - sushi grade, 300 lb from Ocean Fresh in Portland, OR at $18/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_002',
    similarity: 0.88,
    metadata: { species: 'Yellowfin Tuna', grade: 'sushi', quantity: '300 lb', location: 'Portland, OR', seller: 'Ocean Fresh', price: 18.00 }
  },
  {
    itemId: 'listing_003',
    itemType: 'listing',
    content: 'Albacore Tuna - B grade, 200 lb bulk lot from Fisherman Joe in San Diego, CA at $8/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_003',
    similarity: 0.82,
    metadata: { species: 'Albacore Tuna', grade: 'B', quantity: '200 lb', location: 'San Diego, CA', seller: 'Fisherman Joe', price: 8.00 }
  },
  {
    itemId: 'listing_004',
    itemType: 'listing',
    content: 'Bigeye Tuna - A grade, 450 lb fresh catch from Deep Sea Fisheries in Los Angeles, CA at $15/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_004',
    similarity: 0.79,
    metadata: { species: 'Bigeye Tuna', grade: 'A', quantity: '450 lb', location: 'Los Angeles, CA', seller: 'Deep Sea Fisheries', price: 15.00 }
  },
  {
    itemId: 'listing_005',
    itemType: 'listing',
    content: 'Skipjack Tuna - commercial grade, 1000 lb pallet from Global Seafood Trading in Miami, FL at $6/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_005',
    similarity: 0.75,
    metadata: { species: 'Skipjack Tuna', grade: 'commercial', quantity: '1000 lb', location: 'Miami, FL', seller: 'Global Seafood Trading', price: 6.00 }
  },
  {
    itemId: 'listing_006',
    itemType: 'listing',
    content: 'Salmon - King/Chinook, A grade, 350 lb from Alaska Wild Catch in Juneau, AK at $22/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_006',
    similarity: 0.71,
    metadata: { species: 'King Salmon', grade: 'A', quantity: '350 lb', location: 'Juneau, AK', seller: 'Alaska Wild Catch', price: 22.00 }
  },
  {
    itemId: 'listing_007',
    itemType: 'listing',
    content: 'Halibut - Pacific, B grade, 180 lb from North Coast Fisheries in Anchorage, AK at $14/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_007',
    similarity: 0.68,
    metadata: { species: 'Pacific Halibut', grade: 'B', quantity: '180 lb', location: 'Anchorage, AK', seller: 'North Coast Fisheries', price: 14.00 }
  },
  {
    itemId: 'listing_008',
    itemType: 'listing',
    content: 'Cod - Atlantic, A grade, 600 lb from Boston Fish Market in Boston, MA at $9/lb',
    url: 'https://finventory-web-593576627371.us-central1.run.app/listing/listing_008',
    similarity: 0.65,
    metadata: { species: 'Atlantic Cod', grade: 'A', quantity: '600 lb', location: 'Boston, MA', seller: 'Boston Fish Market', price: 9.00 }
  }
];

// Simple keyword matching
function findListings(query, limit) {
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);

  const scored = MOCK_INVENTORY.map(item => {
    const content = item.content.toLowerCase();
    let score = 0;
    let matches = 0;

    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        matches++;
        // Higher score for species names
        if (['tuna', 'salmon', 'cod', 'halibut'].includes(keyword)) score += 3;
        else if (['grade', 'lb', 'pounds'].includes(keyword)) score += 2;
        else score += 1;
      }
    }

    // Bonus for quantity matches
    const quantityMatch = query.match(/(\d+)\s*(lb|pounds?|kg)/i);
    if (quantityMatch && item.content.includes(quantityMatch[1])) {
      score += 2;
    }

    return { ...item, similarity: Math.min(0.95, 0.5 + (matches * 0.15) + (score * 0.05)) };
  }).filter(item => item.similarity > 0.5);

  // Sort by similarity and return top results
  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

// Generate AI-powered response
async function generateAIResponse(query, listings) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || listings.length === 0) {
    // Fallback to template response
    if (listings.length === 0) {
      return `I couldn't find any listings matching "${query}". Try searching for different fish species like "tuna", "salmon", or "cod", or adjust your quantity requirements.`;
    }
    const totalAvailable = listings.reduce((sum, l) => {
      const qty = l.metadata?.quantity?.match(/(\d+)/)?.[1];
      return sum + (qty ? parseInt(qty) : 0);
    }, 0);
    let answer = `Found **${listings.length} listing${listings.length > 1 ? 's' : ''}** for "${query}" with ~${totalAvailable} lb total available:\n\n`;
    answer += listings.map(l => {
      const meta = l.metadata;
      return `- **[${meta.species || 'Fish'} - ${meta.grade || 'Unknown'} grade](${l.url})**\n  ${meta.quantity || ''} from ${meta.seller || 'Unknown'} in ${meta.location || 'Unknown'}${meta.price ? ` at **$${meta.price}/lb**` : ''}`;
    }).join('\n\n');
    return answer;
  }

  // Build context from listings
  const context = listings.map(l => `- ${l.content} (Link: ${l.url})`).join('\n');

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemma-3-12b-it',
        messages: [
          {
            role: 'user',
            content: `You are a helpful fish market assistant named Shelby. Help buyers find what they need from the available inventory. Always cite specific listings using markdown links like [item description](url). Be concise but friendly and use crab emojis occasionally 🦀.

Available inventory:
${context}

Buyer asks: ${query}

Respond helpfully, citing relevant listings with [description](url) links. If nothing matches, say so clearly.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Gemma API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from AI';
  } catch (error) {
    console.error('AI generation failed:', error);
    // Fallback response
    const totalAvailable = listings.reduce((sum, l) => {
      const qty = l.metadata?.quantity?.match(/(\d+)/)?.[1];
      return sum + (qty ? parseInt(qty) : 0);
    }, 0);
    let answer = `Found **${listings.length} listing${listings.length > 1 ? 's' : ''}** for "${query}" with ~${totalAvailable} lb total available:\n\n`;
    answer += listings.map(l => {
      const meta = l.metadata;
      return `- **[${meta.species || 'Fish'} - ${meta.grade || 'Unknown'} grade](${l.url})**\n  ${meta.quantity || ''} from ${meta.seller || 'Unknown'} in ${meta.location || 'Unknown'}${meta.price ? ` at **$${meta.price}/lb**` : ''}`;
    }).join('\n\n');
    return answer;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'finventory-rag-api', timestamp: new Date().toISOString() });
});

// Main RAG search endpoint
app.post('/', async (req, res) => {
  const { query, limit = 5 } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Search using keyword matching
    const listings = findListings(query, limit);

    // Generate AI-powered natural language response
    const answer = await generateAIResponse(query, listings);

    res.json({
      answer,
      listings: listings.map(({ similarity, ...rest }) => ({ ...rest, similarity }))
    });
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Also handle POST to /search for compatibility
app.post('/search', async (req, res) => {
  const { query, limit = 5 } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const listings = findListings(query, limit);
    const answer = await generateAIResponse(query, listings);

    res.json({
      answer,
      listings: listings.map(({ similarity, ...rest }) => ({ ...rest, similarity }))
    });
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🦀 Shelby's brain is running on port ${PORT}`);
});
