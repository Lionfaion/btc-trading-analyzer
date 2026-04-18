const { supabase } = require('./init');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const strategy = JSON.parse(body);
          
          if (!strategy.name || !strategy.parameters) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing name or parameters' }));
            return;
          }

          const { data, error } = await supabase
            .from('strategies')
            .insert([{
              name: strategy.name,
              parameters: strategy.parameters,
              rules: strategy.rules || ''
            }]);

          if (error) throw new Error(error.message);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            strategy: data ? data[0] : strategy,
            message: 'Strategy saved'
          }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } else if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        count: data ? data.length : 0,
        strategies: data || []
      }));
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
};
