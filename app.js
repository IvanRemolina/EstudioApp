"use strict";

const $ = id => document.getElementById(id);

let catalog = [];
let questions = [];
let deck = [];
let position = 0;
let showingAnswer = false;
let lastQuestion = null;
let touchStart = null;

function showCard() {
  const item = deck[position];

  $("card-label").textContent = showingAnswer ? "Respuesta" : "Pregunta";
  $("card-text").textContent = showingAnswer ? item.respuesta : item.pregunta;
  $("card").classList.toggle("answer", showingAnswer);
  $("card").setAttribute(
    "aria-label",
    showingAnswer ? "Respuesta. Mostrar pregunta" : "Pregunta. Mostrar respuesta"
  );
  $("flip").textContent = showingAnswer
    ? "Volver a la pregunta"
    : "Ver respuesta";
  $("counter").textContent = `Pregunta ${position + 1} de ${deck.length}`;
  $("remaining").textContent = `Quedan ${deck.length - position - 1}`;
  $("progress-fill").style.width = `${(position + 1) / deck.length * 100}%`;
  $("next").textContent = position === deck.length - 1
    ? "Terminar ronda ✓"
    : "Siguiente pregunta →";
}

function startRound() {
  deck = questions.slice();

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  if (deck.length > 1 && deck[0] === lastQuestion) {
    const j = 1 + Math.floor(Math.random() * (deck.length - 1));
    [deck[0], deck[j]] = [deck[j], deck[0]];
  }

  position = 0;
  showingAnswer = false;
  $("library").hidden = true;
  $("complete").hidden = true;
  $("study").hidden = false;
  showCard();
}

function setAnswer(value) {
  showingAnswer = value;
  showCard();
}

function validateCatalogItem(item, subjectName, topicName) {
  if (
    !item ||
    typeof item.pregunta !== "string" ||
    !item.pregunta.trim() ||
    typeof item.respuesta !== "string" ||
    !item.respuesta.trim()
  ) {
    throw new Error(
      `Una tarjeta de «${subjectName} / ${topicName}» no tiene pregunta o respuesta válida.`
    );
  }

  return {
    pregunta: item.pregunta.trim(),
    respuesta: item.respuesta.trim()
  };
}

function syncSubject(subjectId) {
  const subjectCheckbox = $(`subject-${subjectId}`);
  const topicCheckboxes = [...document.querySelectorAll(
    `[data-topic-subject="${subjectId}"]`
  )];
  topicCheckboxes.forEach(input => {
    input.checked = subjectCheckbox.checked;
  });
  syncAllCheckbox();
}

function syncAllCheckbox() {
  const inputs = [...document.querySelectorAll(
    ".subject-check, [data-topic-subject]"
  )];
  $("select-all").checked = inputs.length > 0 && inputs.every(input => input.checked);
}

function renderLibrary() {
  const subjectsElement = $("subjects");
  subjectsElement.replaceChildren();

  catalog.forEach((subject, subjectIndex) => {
    const subjectElement = document.createElement("section");
    subjectElement.className = "subject";

    const header = document.createElement("label");
    header.className = "subject-header";

    const subjectName = document.createElement("span");
    subjectName.textContent = subject.asignatura;

    const subjectCheckbox = document.createElement("input");
    subjectCheckbox.type = "checkbox";
    subjectCheckbox.className = "subject-check";
    subjectCheckbox.id = `subject-${subjectIndex}`;
    subjectCheckbox.checked = true;
    subjectCheckbox.addEventListener("change", () => {
      syncSubject(subjectIndex);
    });

    header.append(subjectName, subjectCheckbox);

    const topicsElement = document.createElement("div");
    topicsElement.className = "topics";

    subject.temas.forEach((topic, topicIndex) => {
      const topicLabel = document.createElement("label");
      topicLabel.className = "topic-row";

      const topicName = document.createElement("span");
      topicName.textContent = topic.nombre;

      const topicCheckbox = document.createElement("input");
      topicCheckbox.type = "checkbox";
      topicCheckbox.checked = true;
      topicCheckbox.dataset.topicSubject = String(subjectIndex);
      topicCheckbox.dataset.topicIndex = String(topicIndex);
      topicCheckbox.addEventListener("change", () => {
        const subjectCheckbox = $(`subject-${subjectIndex}`);
        const topics = [...document.querySelectorAll(
          `[data-topic-subject="${subjectIndex}"]`
        )];
        subjectCheckbox.checked = topics.every(input => input.checked);
        if (topics.some(input => input.checked) && !topics.every(input => input.checked)) {
          subjectCheckbox.indeterminate = true;
        } else {
          subjectCheckbox.indeterminate = false;
        }
        syncAllCheckbox();
      });

      topicLabel.append(topicName, topicCheckbox);
      topicsElement.append(topicLabel);
    });

    subjectElement.append(header, topicsElement);
    subjectsElement.append(subjectElement);
  });

  $("select-all").checked = true;
  $("select-all").indeterminate = false;
  $("library").hidden = false;
}

$("select-all").addEventListener("change", event => {
  const checked = event.target.checked;
  document.querySelectorAll(
    ".subject-check, [data-topic-subject]"
  ).forEach(input => {
    input.checked = checked;
    input.indeterminate = false;
  });
});

$("start").addEventListener("click", () => {
  try {
    const selected = [];

    catalog.forEach((subject, subjectIndex) => {
      subject.temas.forEach((topic, topicIndex) => {
        const topicInput = document.querySelector(
          `[data-topic-subject="${subjectIndex}"][data-topic-index="${topicIndex}"]`
        );

        if (topicInput?.checked) {
          if (!Array.isArray(topic.tarjetas) || !topic.tarjetas.length) {
            throw new Error(
              `El tema «${subject.asignatura} / ${topic.nombre}» no contiene tarjetas.`
            );
          }

          topic.tarjetas.forEach(item => {
            selected.push(validateCatalogItem(
              item,
              subject.asignatura,
              topic.nombre
            ));
          });
        }
      });
    });

    if (!selected.length) {
      throw new Error("Selecciona al menos una asignatura o tema.");
    }

    questions = selected;
    lastQuestion = null;
    $("message").textContent = "";
    startRound();
  } catch (error) {
    $("message").textContent = `No se pudo iniciar el estudio: ${error.message}`;
  }
});

$("card").addEventListener("click", () => {
  setAnswer(!showingAnswer);
});

$("flip").addEventListener("click", () => {
  setAnswer(!showingAnswer);
});

$("next").addEventListener("click", () => {
  lastQuestion = deck[position];
  position++;

  if (position === deck.length) {
    $("study").hidden = true;
    $("complete-text").textContent =
      `Has visto ${deck.length === 1 ? "la única tarjeta" : `las ${deck.length} tarjetas`} sin repetir.`;
    $("complete").hidden = false;
    $("restart").focus();
    return;
  }

  showingAnswer = false;
  showCard();
});

$("restart").addEventListener("click", () => {
  startRound();
  $("card").focus();
});

$("card").addEventListener("touchstart", event => {
  if (event.touches.length === 1) {
    touchStart = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }
}, { passive: true });

$("card").addEventListener("touchend", event => {
  if (!touchStart || event.changedTouches.length !== 1) {
    touchStart = null;
    return;
  }

  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  touchStart = null;

  if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy)) {
    event.preventDefault();
    setAnswer(dx < 0);
  }
});

$("card").addEventListener("touchcancel", () => {
  touchStart = null;
});

document.addEventListener("keydown", event => {
  if (
    $("study").hidden ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    setAnswer(event.key === "ArrowLeft");
  }
});

async function loadLibrary() {
  $("library").hidden = true;
  $("message").textContent = "Cargando biblioteca...";

  try {
    const manifestResponse = await fetch("manifest.json");

    if (!manifestResponse.ok) {
      throw new Error(`No se pudo leer manifest.json (${manifestResponse.status}).`);
    }

    const manifest = await manifestResponse.json();

    if (!manifest || !Array.isArray(manifest.asignaturas)) {
      throw new Error("manifest.json no tiene una lista válida de asignaturas.");
    }

    catalog = [];

    for (const entry of manifest.asignaturas) {
      if (!entry || typeof entry.archivo !== "string") {
        throw new Error("Hay una entrada inválida en manifest.json.");
      }

      const response = await fetch(entry.archivo);

      if (!response.ok) {
        throw new Error(`No se pudo leer ${entry.archivo} (${response.status}).`);
      }

      const subject = await response.json();

      if (
        !subject ||
        typeof subject.asignatura !== "string" ||
        !Array.isArray(subject.temas)
      ) {
        throw new Error(`${entry.archivo} tiene un formato JSON no compatible.`);
      }

      catalog.push(subject);
    }

    if (!catalog.length) {
      throw new Error("No hay asignaturas disponibles.");
    }

    $("message").textContent = "";
    renderLibrary();
  } catch (error) {
    $("message").textContent =
      `No se pudo cargar la biblioteca: ${error.message}`;
  }
}

loadLibrary();
