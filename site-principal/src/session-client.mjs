import { getUser, refreshSession } from '@netlify/identity';
import { installSessionBridge } from '../../shared/session-bridge.mjs';
installSessionBridge({getUser,refreshSession});
