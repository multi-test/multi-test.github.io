function render() {
  try {
    const hash = location.hash;
    const hashedState = hash.substring(hash.indexOf('#') + 1);
    const state = cattell.decodeState(hashedState);

    for (let i = 1; i <= 187; i++) {
      const answer = state.answers[i - 1];

      if (answer) {
        const id = `q${i}${answer}`;
        const radio = document.getElementById(id);
        radio.checked = true;
      }
    }
  } catch (e) {
    alert(e.message);
  }
}

window.onload = render;
window.onhashchange = render;
