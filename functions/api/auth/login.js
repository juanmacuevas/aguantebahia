// functions/api/auth/login.js
export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Allow": "POST"
        }
      });
    }
    
    try {
      const body = await request.json();
      const { username, passwordHash } = body; // Recibimos el hash, no la contraseña
      
      // Obtener credenciales de las variables de entorno
      const validUsername = env.ADMIN_USERNAME || 'admin';
      const validPasswordHash = env.ADMIN_PASSWORD_HASH;
      
      if (!validPasswordHash) {
        console.error("ADMIN_PASSWORD_HASH not set in environment");
        console.log('Hash recibido del cliente:', passwordHash);
        console.log('Hash esperado (de env):', validPasswordHash);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Configuration error" 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Verificar usuario y hash
      if (username !== validUsername || passwordHash !== validPasswordHash) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Invalid credentials" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Credenciales válidas, generar token de sesión
      const sessionToken = btoa(`${username}:${Date.now()}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        token: sessionToken
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error("Login error:", error);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Server error" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
        
      });
    }
  }