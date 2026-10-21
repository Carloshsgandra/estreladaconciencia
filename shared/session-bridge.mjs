export function installSessionBridge(identity, env=globalThis) {
  let pending;
  env.iecEnsureSession=()=>{
    if(!pending)pending=(async()=>{const user=await identity.getUser();if(user)await identity.refreshSession();})().finally(()=>{pending=null;});
    return pending;
  };
  // Signal readiness before the classic app requests its first state.
  env.iecSessionReady=env.iecEnsureSession();
  env.iecSessionReady.catch(()=>{});
}
