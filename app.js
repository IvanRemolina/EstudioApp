"use strict";

const $ = id => document.getElementById(id);

let catalog = [];
let questions = [];
let deck = [];
let position = 0;
let showingAnswer = false;
let lastQuestion = null;
let touchStart = null;
let studyMode = "cards";

function showQuestion() {
  const item = deck[position];
  $("counter").textContent = `Pregunta ${position + 1} de ${deck.length}`;
  $("remaining").textContent = `Quedan ${deck.length - position - 1}`;
  $("progress-fill").style.width = `${(position + 1) / deck.length * 100}%`;

  if (studyMode === "cards") {
    $("cards-view").hidden = false;
    $("quiz-view").hidden = true;
    $("keyboard-help").hidden = false;
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
    $("next").textContent = position === deck.length - 1
      ? "Terminar ronda ✓"
      : "Siguiente pregunta →";
    return;
  }

  $("cards-view").hidden = true;
  $("quiz-view").hidden = false;
  $("keyboard-help").hidden = true;
  $("quiz-question-text").textContent = item.pregunta;
  $("quiz-feedback").textContent = "";
  $("quiz-feedback").className = "quiz-feedback";
  $("quiz-next").disabled = true;
  $("quiz-next").textContent = position === deck.length - 1
    ? "Terminar test ✓"
    : "Siguiente pregunta →";
  $("quiz-options").replaceChildren();

  item.opciones.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option";
    button.textContent = `${option.etiqueta}. ${option.texto}`;
    button.addEventListener("click", () => selectQuizAnswer(index));
    $("quiz-options").append(button);
  });
}

function shuffle(items) {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function startRound() {
  deck = shuffle(questions);

  if (deck.length > 1 && deck[0] === lastQuestion) {
    [deck[0], deck[1]] = [deck[1], deck[0]];
  }

  position = 0;
  showingAnswer = false;
  $("library").hidden = true;
  $("complete").hidden = true;
  $("study").hidden = false;
  showQuestion();
}

function setAnswer(value) {
  showingAnswer = value;
  showQuestion();
}

function validateCatalogItem(item, subjectName, topicName) {
  if (!item || typeof item.pregunta !== "string" || !item.pregunta.trim()) {
    throw new Error(
      `Una pregunta de «${subjectName} / ${topicName}» no tiene un texto válido.`
    );
  }

  if (item.opciones !== undefined || item.respuesta_correcta !== undefined) {
    if (
      !item.opciones ||
      typeof item.opciones !== "object" ||
      Array.isArray(item.opciones) ||
      typeof item.respuesta_correcta !== "string"
    ) {
      throw new Error(
        `La pregunta «${item.pregunta}» de «${subjectName} / ${topicName}» tiene opciones o respuesta correcta inválidas.`
      );
    }

    const entries = Object.entries(item.opciones);
    if (
      entries.length < 2 ||
      entries.some(([, text]) => typeof text !== "string" || !text.trim()) ||
      !Object.hasOwn(item.opciones, item.respuesta_correcta)
    ) {
      throw new Error(
        `La pregunta «${item.pregunta}» de «${subjectName} / ${topicName}» necesita al menos dos opciones y una respuesta correcta válida.`
      );
    }

    return {
      pregunta: item.pregunta.trim(),
      respuesta: item.opciones[item.respuesta_correcta].trim(),
      opciones: entries.map(([key, text]) => ({
        etiqueta: key,
        texto: text.trim(),
        correcta: key === item.respuesta_correcta
      }))
    };
  }

  if (typeof item.respuesta !== "string" || !item.respuesta.trim()) {
    throw new Error(
      `Una tarjeta de «${subjectName} / ${topicName}» no tiene pregunta o respuesta válida.`
    );
  }

  return {
    pregunta: item.pregunta.trim(),
    respuesta: item.respuesta.trim(),
    opciones: null
  };
}

function prepareQuizQuestions(selected) {
  const answers = [...new Set(selected.flatMap(item => [
    item.respuesta,
    ...(item.opciones || []).map(option => option.texto)
  ]))];
  if (selected.some(item =>
    !item.opciones && !answers.some(answer => answer !== item.respuesta)
  )) {
    throw new Error(
      "El modo tipo test necesita al menos dos respuestas distintas para crear opciones."
    );
  }

  return selected.map(item => {
    if (item.opciones) {
      return { ...item, opciones: shuffle(item.opciones) };
    }

    const distractors = shuffle(answers.filter(answer => answer !== item.respuesta))
      .slice(0, 3);
    const options = shuffle([
      { texto: item.respuesta, correcta: true },
      ...distractors.map(texto => ({ texto, correcta: false }))
    ]).map((option, index) => ({
      ...option,
      etiqueta: String.fromCharCode(65 + index)
    }));

    return { ...item, opciones: options };
  });
}

function selectQuizAnswer(selectedIndex) {
  const item = deck[position];
  const buttons = [...$("quiz-options").querySelectorAll(".quiz-option")];
  const selected = item.opciones[selectedIndex];
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (item.opciones[index].correcta) {
      button.classList.add("correct");
    }
  });

  const correct = selected.correcta;
  if (!correct) {
    buttons[selectedIndex].classList.add("incorrect");
    $("quiz-feedback").textContent =
      `No has acertado. La respuesta correcta es: ${item.respuesta}`;
    $("quiz-feedback").classList.add("incorrect-feedback");
  } else {
    $("quiz-feedback").textContent = "¡Correcto! Has acertado.";
    $("quiz-feedback").classList.add("correct-feedback");
  }

  $("quiz-next").disabled = false;
}

function advanceQuestion() {
  lastQuestion = deck[position];
  position++;

  if (position === deck.length) {
    $("study").hidden = true;
    $("complete-text").textContent = studyMode === "quiz"
      ? `Has respondido ${deck.length === 1 ? "la única pregunta" : `las ${deck.length} preguntas`}.`
      : `Has visto ${deck.length === 1 ? "la única tarjeta" : `las ${deck.length} tarjetas`} sin repetir.`;
    $("complete").hidden = false;
    $("restart").focus();
    return;
  }

  showingAnswer = false;
  showQuestion();
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
        subjectCheckbox.indeterminate =
          topics.some(input => input.checked) && !topics.every(input => input.checked);
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

document.querySelectorAll(".mode-option").forEach(button => {
  button.addEventListener("click", () => {
    studyMode = button.dataset.mode;
    document.querySelectorAll(".mode-option").forEach(option => {
      const selected = option === button;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
  });
});

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
              `El tema «${subject.asignatura} / ${topic.nombre}» no contiene preguntas.`
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

    questions = studyMode === "quiz" ? prepareQuizQuestions(selected) : selected;
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

$("next").addEventListener("click", advanceQuestion);
$("quiz-next").addEventListener("click", advanceQuestion);

$("restart").addEventListener("click", () => {
  startRound();
  if (studyMode === "cards") {
    $("card").focus();
  }
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
    studyMode !== "cards" ||
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

      if (!subject || typeof subject.asignatura !== "string") {
        throw new Error(`${entry.archivo} tiene un formato JSON no compatible.`);
      }

      if (Array.isArray(subject.preguntas)) {
        catalog.push({
          asignatura: subject.asignatura,
          temas: [{
            nombre: typeof subject.tema === "string" ? subject.tema : "General",
            tarjetas: subject.preguntas
          }]
        });
      } else if (Array.isArray(subject.temas)) {
        catalog.push(subject);
      } else {
        throw new Error(`${entry.archivo} tiene un formato JSON no compatible.`);
      }
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
