export async function onRequest(context) {
    // Get the DB binding from environment
    const { request, env } = context;
    
    // Handle CORS for preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    
    // Handle GET request - retrieve all incidents
    if (request.method === "GET") {
      try {
        // Query the database for all incidents
        const incidents = await env.DB.prepare(`
          SELECT id, category, subcategory, description, urgent, 
                 json_extract(location, '$.lat') as lat, 
                 json_extract(location, '$.lng') as lng, 
                 timestamp 
          FROM incidents 
          ORDER BY timestamp DESC
        `).all();
        
        // Format the response data
        const formattedIncidents = incidents.results.map(incident => ({
          id: incident.id,
          category: incident.category,
          subcategory: incident.subcategory,
          description: incident.description,
          urgent: incident.urgent === 1,
          location: {
            lat: parseFloat(incident.lat),
            lng: parseFloat(incident.lng)
          },
          timestamp: incident.timestamp
        }));
        
        // Return the incidents as JSON
        return new Response(JSON.stringify(formattedIncidents), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error("Error fetching incidents:", error);
        return new Response(JSON.stringify({ error: "Error fetching incidents" }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }
    
    // Handle POST request - create a new incident
    if (request.method === "POST") {
      try {
        // Parse the JSON body
        const data = await request.json();
        
        // Validate required fields
        if (!data.category || !data.subcategory || !data.description || !data.location) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        
        // Validate location
        if (typeof data.location.lat !== 'number' || typeof data.location.lng !== 'number') {
          return new Response(JSON.stringify({ error: "Invalid location format" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        
        // Convert urgent boolean to integer for SQLite
        const urgent = data.urgent ? 1 : 0;
        
        // Convert location to JSON string for storage
        const locationJson = JSON.stringify(data.location);
        
        // Get current timestamp
        const timestamp = new Date().toISOString();
        
        // Insert the incident into the database
        const result = await env.DB.prepare(`
          INSERT INTO incidents (category, subcategory, description, urgent, location, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          data.category,
          data.subcategory,
          data.description,
          urgent,
          locationJson,
          timestamp
        )
        .run();
        
        // Return success response with the created incident ID
        return new Response(JSON.stringify({ 
          success: true, 
          id: result.meta.last_row_id,
          message: "Incident reported successfully" 
        }), {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error("Error creating incident:", error);
        return new Response(JSON.stringify({ error: "Error creating incident" }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }
    
    // Handle anything other than GET, POST, or OPTIONS
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Allow": "GET, POST, OPTIONS"
      }
    });
  }