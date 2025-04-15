function e(r){return Number.isInteger(r)?r.toString():r.toFixed(2).replace(/\.?0+$/,"")}function i(r,t){return r.replace(/%[sdio]/g,()=>String(t.shift()??""))}export{e as f,i};
