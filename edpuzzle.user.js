// ==UserScript==
// @name        edpuzzle-answers script launcher
// @namespace   edpuzzle.hs.vc
// @match       https://edpuzzle.com/*
// @grant       none
// @version     1.0.0
// @author      ading2210
// @description This userscript provides a convenient way to launch the edpuzzle-answers script.
// @downloadURL https://raw.githubusercontent.com/ading2210/edpuzzle-answers/refs/heads/main/edpuzzle.user.js
// ==/UserScript==

function launch_script() {
  fetch("https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js")
    .then(r => r.text())
    .then(r => eval(r));
}

function main() {
  const img_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFcUlEQVR4AZxXe0xWZRj/nc9UMLkoqCmJHwJaLFcDnDovwxmXKa5yMLdctdXyEpWKpNOVM7cy76Bmaq3VuuhCQFR0Of6J4UoDGuEayaXFZcWtT3BZxOX0ew7f+TjnfOeDT8+e3/s+t/d5fu/3Hs45OFRA1QH/rrFM20ycIlYT9y16P5kdxtXiMNo2eiB93xJvExFEQVxUwGlVzRxD3S+x9jARkArWBPG5EcD5EvEo8aT60/x9V4/H/tPY2rt+67rv6tXaxUH0jyh2tR0KQIHpskmU5sVMchLL1YqEmRhQr6YtCg6+cDgaH+V3OLe/3/CzeitpIuMPEXOJeEKOixPPWRNN9QxsrGi/gCger1sxkBhPVyERSyznzmdw5jGowZyRuigEhQejkfd1mzNzc3WdouBX+muJSqKLeNNQi+aQ6D01AuLSHaLrcC88TzuOWK5WLpiKwcFr1EMIj6xcEoLzB2ajpPzOIxszpjhWrQiJbix+IufglogW1sjzJLoVYy8PAYkZA2ILWCCds+x8EtSBa1ARCptr9bJQNBTPw8kdkc7LB2IqoyLGH8rJbX3cmmrtYSIgydYE8ZFEI8+8lMc4WWxfmB7uPnIhmSgnYMmsSMixeOBFQBLsSCCxIkxifsGm+aUj0bJ0iQxG2BKQBJKQyQybwuYEWjY5Y/mUiH9sAqAod2G5fBKQPJJIk9kEmwaeuE0savo4rFwcgoip43iCqvw1edJFccgwArrbPgkt8YrbNIKdryIBezbMwJXr3ThT1NGJhKDL1lqjEcC0UKXPdcS6jLaxoVFnSBM2l/ml9DCc3jULWR80hR/aWl+uqknyoJKQhlEJSNakh4Guw6JZII0FFjfczXX3y8+E48Mdkdh5vGXB0ez6MuO7wy8CUiiMD9lOOxISNMLSXA+tXzMFx96KxPZjLYsu5laV6CT8JiCFwkmiWt6DYtjBR3M9dVPGFKQvDUVBqSsVlb+dEP99EZAFrnsyPjhcPf0IHC9t1Y3yBhXN72q324AkuxtSr2B3P+gxztuONqOq9h6y102jhSbMTf7bbwL17cCc3bJuFPggsT2vBWcKO3H1WCzmOANcrPKcouwZ9ItAQwcQ8w6XWEXOXGD1k8ThL9tQVjX04Nt1ohUn8ztQkheDxU9N7IYyJkVJrKySZaMSqPl9YEK03Y1nbGzUpSqxLbcFyVl16pw1twbzzrXjcm4MlsUH9zCUqsTfrOCsyWgEZs3b1pOiZRoHm4bHc2YaMzS9t09V6pp6r7+4anJ2UmLQDTgcadz5DS3oHkYkwNfwOXfe8GTTXIL7PvsTp3dGimoCayw9VdB5lI0Xcuffm4I0fBLgQoYt4qP5H519EKQs5FdaZcI3llX8hhGxeodsWwJsThlK8Iw+mks8dCLft1S6uvsBBTWKjDBfLEgx+8TyIsAsioSGUbA/2mtXw1EgMMCBFfODcOQrPihUaOfgLwkTAXamGEuDG8KJjB0NqcVlLvk4ha8rMW4C8ktd+KXx30y1ZoH2pPGHhIcAO1PM5d0F3qD37LPZjU9fKb9TSN1LTua3c/ftOPvebMTNDghEb3+snuSuoZvazEYUTYVGgBZlyKGPloWv0Z+/aktD0rUfeoqoe+RMYQc2H2rGF3udyEie9B8wJoN3fLkngYoC+SFhutiQAjg4UkwxyVbMHu0u3kDfhdTX65aV/ni3mDo+LupA1v4mfP5uFNamTO6DomQqCTe9vnoklwUpog2DjVXtFxh2AcyiwO5iPl5loDh50+30GWnVPVn7m/HpbieeTwvr5+N1rRJfcZFxn8LCFHPYRIBRijnBYg3SfoVIb/urfy//G8p7IT28EA4ljTsvot9LrA42oAx7/wcAAP//CT/cwwAAAAZJREFUAwATjKnnXUoBgAAAAABJRU5ErkJggg==";
  const img = document.createElement("img");
  img.id = "_" + crypto.randomUUID();
  img.src = img_url;
  img.onclick = launch_script;

  const css = `
    #${img.id} {
      position: absolute;
      bottom: 8px;
      right: 8px;
      opacity: 0.2;
    }

    #${img.id}:hover {
      opacity: 1.0;
    }
  `;
  const style = document.createElement("style");
  style.innerHTML = css;

  document.body.append(style);
  document.body.append(img);
}

main();