import { fetch_with_auth, base_url, edpuzzle_data, construct_headers } from "./main.js";

const captcha_div = document.getElementById("captcha_div");
const captcha_action = "log_in_edpuzzle";
let verified_callback = () => {};

export function setup_captcha() {
  if (window.mtcaptchaConfig)
    return;

  return new Promise((resolve) => {
    window.mtcaptchaConfig = {
      "sitekey": edpuzzle_data.captchaClientId,
      "render": "explicit",
      "jsloaded-callback": (state) => {
        resolve(state)
      },
      "verified-callback": (state) => {
        verified_callback(state.verifiedToken)
      },
      "renderQueue": [],
      "action": captcha_action
    };
    let script = document.createElement("script");
    script.async = true;
    script.src = "https://service.mtcaptcha.com/mtcv1/client/mtcaptcha.min.js";
    document.head.append(script);
  })
}

export async function complete_captcha() {
  await setup_captcha();

  let target = document.createElement("div");
  target.id = captcha_action;
  captcha_div.append(target);

  window.mtcaptchaConfig.renderQueue.push(captcha_action);
  let captcha_token = await new Promise((resolve) => {
    verified_callback = resolve;
  });
  target.remove();
  return captcha_token;
}

export async function submit_captcha(captcha_token) {
  let response = await fetch_with_auth(base_url + `/api/captcha_token`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({captcha_token: captcha_token})
  })
  let data = await response.json();
  return data.success;
}
