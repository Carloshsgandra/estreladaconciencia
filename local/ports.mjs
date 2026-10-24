import { createServer } from 'node:net';
export async function requireAvailablePorts(ports) {
  for (const port of [...new Set(ports)]) {
    await new Promise((resolve, reject) => {
      const server=createServer();
      server.once('error',error=>reject(new Error(`Não foi possível iniciar: porta ${port} indisponível (${error.code}). Se o projeto já estiver aberto, use http://127.0.0.1:8888. Para reiniciar, pressione Ctrl+C uma vez na janela anterior e aguarde a exportação. Não abra duas instâncias.`,{cause:error})));
      server.listen({host:'127.0.0.1',port},()=>server.close(resolve));
    });
  }
}
