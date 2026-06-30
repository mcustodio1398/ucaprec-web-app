import { createClient } from "@supabase/supabase-js";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Método no permitido." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Falta configurar SUPABASE_URL/VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Netlify." });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return json(401, { error: "Sesión no válida. Inicie sesión nuevamente." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Solicitud inválida." });
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!email || !password) {
    return json(400, { error: "Debe indicar el usuario y la nueva contraseña." });
  }

  if (password.length < 8) {
    return json(400, { error: "La contraseña debe tener mínimo 8 caracteres." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionData, error: sessionError } = await adminClient.auth.getUser(accessToken);
  if (sessionError || !sessionData.user?.email) {
    return json(401, { error: "No fue posible validar la sesión del administrador." });
  }

  const { data: requester, error: requesterError } = await adminClient
    .from("usuarios")
    .select("usuario,email,rol,estatus")
    .eq("email", sessionData.user.email.toLowerCase())
    .maybeSingle();

  if (requesterError || !requester || requester.rol !== "Administrador" || requester.estatus !== "Activo") {
    return json(403, { error: "Solo un administrador activo puede resetear contraseñas." });
  }

  let page = 1;
  let targetUser = null;
  while (!targetUser) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return json(500, { error: "No fue posible buscar el usuario en autenticación." });

    targetUser = data.users.find(user => user.email?.toLowerCase() === email) || null;
    if (targetUser || data.users.length < 1000) break;
    page += 1;
  }

  if (!targetUser) {
    return json(404, { error: "No se encontró ese usuario en Supabase Authentication." });
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
    password,
    email_confirm: true,
  });

  if (updateError) {
    return json(500, { error: updateError.message || "No fue posible actualizar la contraseña." });
  }

  await adminClient.from("auditoria").insert({
    usuario: requester.usuario,
    accion: "RESETEAR_CONTRASEÑA",
    modulo: "Usuarios",
    entidad: email,
    detalle: "Contraseña restablecida por administrador desde Usuarios y Roles",
    tipo: "security",
  });

  return json(200, { ok: true, message: "Contraseña restablecida exitosamente." });
};
