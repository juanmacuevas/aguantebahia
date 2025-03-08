// functions/api/admin.js
export async function onRequest(context) {
    const { request, env } = context;
    
    // Manejar CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    
    // Verificar token de autenticación
    const authHeader = request.headers.get('Authorization');
    
    // Si no hay token o no es de tipo Bearer, rechazar
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Extraer token
    const token = authHeader.split(' ')[1];
    
    // Validar token simple (en producción deberías usar algo más robusto)
    try {
      const decodedToken = atob(token);
      const [username, timestamp] = decodedToken.split(':');
      const tokenTime = parseInt(timestamp, 10);
      
      // Verificar que el token no tenga más de 24 horas
      if (Date.now() - tokenTime > 24 * 60 * 60 * 1000) {
        throw new Error("Token expired");
      }
      
      // Verificar que el usuario sea el administrador
      if (username !== (env.ADMIN_USERNAME || 'admin')) {
        throw new Error("Invalid user");
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Aquí el token es válido, continuamos con la funcionalidad de admin
    
    // Handle GET request - list all incidents
    if (request.method === 'GET') {
      try {
        const incidents = await env.DB.prepare(`
          SELECT id, category, subcategory, description, urgent, 
                 json_extract(location, '$.lat') as lat, 
                 json_extract(location, '$.lng') as lng, 
                 timestamp 
          FROM incidents 
          ORDER BY timestamp DESC
        `).all();
        
        return new Response(JSON.stringify(incidents.results), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // Handle DELETE request - remove an incident
    if (request.method === 'DELETE') {
      try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        
        if (!id) {
          return new Response(JSON.stringify({ error: 'Incident ID is required' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        await env.DB.prepare('DELETE FROM incidents WHERE id = ?').bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // If we get here, the method is not supported
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Allow': 'GET, DELETE, OPTIONS'
      }
    });
  }