import './login.css';

import { Trans, useLingui } from '@lingui/react/macro';
import Fuse from 'fuse.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useSearchParams } from 'react-router-dom';
import instancesListURL from '../data/instances.json?url';
import {
  getAuthorizationURL,
  getPKCEAuthorizationURL,
  registerApplication,
} from '../utils/auth';
import { supportsPKCE } from '../utils/oauth-pkce';
import store from '../utils/store';
import useTitle from '../utils/useTitle';

const { PHANPY_MASTODON_INSTANCE_URL: INSTANCE_URL  } = import.meta.env;

function Login() {

  useEffect(() => {
    submitInstance(INSTANCE_URL);
  }, []);


  const submitInstance = (instanceURL) => {
    if (!instanceURL) return;

    (async () => {
      // WEB_DOMAIN vs LOCAL_DOMAIN negotiation time
      // https://docs.joinmastodon.org/admin/config/#web_domain
      try {
        const res = await fetch(`https://${instanceURL}/.well-known/host-meta`); // returns XML
        const text = await res.text();
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        // Get Link[template]
        const link = xmlDoc.getElementsByTagName('Link')[0];
        const template = link.getAttribute('template');
        const url = URL.parse(template);
        const { host } = url; // host includes the port
        if (instanceURL !== host) {
          console.log(`💫 ${instanceURL} -> ${host}`);
          instanceURL = host;
        }
      } catch (e) {
        // Silently fail
        console.error(e);
      }

      store.local.set('instanceURL', instanceURL);

      try {
        const { client_id, client_secret, vapid_key } =
          await registerApplication({
            instanceURL,
          });

        const authPKCE = await supportsPKCE({ instanceURL });
        console.log({ authPKCE });
        if (authPKCE) {
          if (client_id && client_secret) {
            store.sessionCookie.set('clientID', client_id);
            store.sessionCookie.set('clientSecret', client_secret);
            store.sessionCookie.set('vapidKey', vapid_key);

            const [url, verifier] = await getPKCEAuthorizationURL({
              instanceURL,
              client_id,
            });
            store.sessionCookie.set('codeVerifier', verifier);
            location.href = url;
          } else {
            alert(t`Failed to register application`);
          }
        } else {
          if (client_id && client_secret) {
            store.sessionCookie.set('clientID', client_id);
            store.sessionCookie.set('clientSecret', client_secret);
            store.sessionCookie.set('vapidKey', vapid_key);

            location.href = await getAuthorizationURL({
              instanceURL,
              client_id,
            });
          } else {
            alert(t`Failed to register application`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
  };

  return (
    <main id="login" style={{ textAlign: 'center' }}>
        <div>Redirecting to {INSTANCE_URL}...</div>
    </main>
  );
}

export default Login;
