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
            // Set up cache key based on the path
            const url = new URL(request.url);
            const cacheKey = new Request(url.toString(), request);

            // Check if the request is in the cache
            const cache = caches.default;
            let cachedResponse = await cache.match(cacheKey);

            if (cachedResponse) {
                // Add a header to indicate cache hit
                const responseHeaders = new Headers(cachedResponse.headers);
                responseHeaders.set("X-Cache", "HIT");
                return new Response(cachedResponse.body, {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: responseHeaders
                });
            }

            // Query the database for visible incidents AND with less than 3 deletion votes
            const incidents = await env.DB.prepare(`
          SELECT id, category, subcategory, description, urgent, 
                 json_extract(location, '$.lat') as lat, 
                 json_extract(location, '$.lng') as lng, 
                 timestamp, 
                 visibility,
                 deletion_votes
          FROM incidents 
          WHERE visibility = 1 AND deletion_votes < 3
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
                timestamp: incident.timestamp,
                deletion_votes: incident.deletion_votes
                // No incluimos visibility en la respuesta ya que todos los registrados serán 1
            }));

            // Create the response
            const responseData = JSON.stringify(formattedIncidents);
            const headers = {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "X-Cache": "MISS",
                // Set cache control headers
                "Cache-Control": "public, max-age=60", // Cache for 60 seconds
            };

            const response = new Response(responseData, { headers });

            // Store the response in the cache
            context.waitUntil(cache.put(cacheKey, response.clone()));

            return response;
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

    // Handle POST request - create a new incident or vote to delete
    if (request.method === "POST") {
        try {
            // Parse the JSON body
            const data = await request.json();

            // Comprobar si es una solicitud para votar por eliminación
            if (data.action === 'vote_delete' && data.incidentId) {
                const incidentId = parseInt(data.incidentId);
                
                if (isNaN(incidentId)) {
                    return new Response(JSON.stringify({ error: "Invalid incident ID" }), {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*"
                        }
                    });
                }
                
                // Incrementar los votos de eliminación
                const result = await env.DB.prepare(`
                    UPDATE incidents 
                    SET deletion_votes = deletion_votes + 1 
                    WHERE id = ?
                `).bind(incidentId).run();
                
                // Verificar si la actualización fue exitosa
                if (result.meta.changes === 0) {
                    return new Response(JSON.stringify({ error: "Incident not found" }), {
                        status: 404,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*"
                        }
                    });
                }

                // Obtener el contador actual para comprobar si se debe ocultar el incidente
                const updatedIncident = await env.DB.prepare(`
                    SELECT deletion_votes FROM incidents WHERE id = ?
                `).bind(incidentId).first();
                
                // Si los votos superan el umbral (3), ocultar el incidente
                if (updatedIncident.deletion_votes >= 3) {
                    await env.DB.prepare(`
                        UPDATE incidents SET visibility = 0 WHERE id = ?
                    `).bind(incidentId).run();
                }

                // Limpiar la caché para garantizar datos frescos en la próxima solicitud GET
                const cache = caches.default;
                const cacheKey = new Request(new URL(request.url).origin + '/api/incidents', { method: 'GET' });
                context.waitUntil(cache.delete(cacheKey));

                return new Response(JSON.stringify({
                    success: true,
                    message: "Vote registered successfully",
                    deletion_votes: updatedIncident.deletion_votes
                }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    }
                });
            }

            // Continuamos con la lógica original para crear incidentes
            // Validate required fields for new incident
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

            // Insert the incident into the database with default visibility=1 and deletion_votes=0
            const result = await env.DB.prepare(`
          INSERT INTO incidents (category, subcategory, description, urgent, location, timestamp, visibility, deletion_votes)
          VALUES (?, ?, ?, ?, ?, ?, 1, 0)
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

            // After successful POST, clear the cache to ensure fresh data on next GET
            const cache = caches.default;
            // Create a URL object to build cache key
            const url = new URL(request.url);
            const cacheKey = new Request(url.toString(), { method: 'GET' });
            context.waitUntil(cache.delete(cacheKey));

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
            console.error("Error processing request:", error);
            return new Response(JSON.stringify({ error: "Error processing request" }), {
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