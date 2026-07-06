exports.handler = async function () {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'fw_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
    body: JSON.stringify({ ok: true }),
  };
};
