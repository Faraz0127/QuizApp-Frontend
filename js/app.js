// ============================================================
//  app.js — QuizApp JavaScript
// ============================================================

// ------------------------------------------------------------------
// 🔧 Change this to your Render URL after deploying!
//    For local testing: "http://localhost:8080"
// ------------------------------------------------------------------
const BASE_URL = "https://quizapp-springboot-aze7.onrender.com";

// Global variables
let currentQuizId = null;
let totalQuestions = 0;


// ==================================================================
// STEP 1 — createQuiz()
//   Reads form, sends POST to /quiz/create, gets back the quiz ID
// ==================================================================
async function createQuiz() {

  // Read form values
  const title    = document.getElementById("quizTitle").value.trim();
  const category = document.getElementById("quizCategory").value;       // "Java" or "Python"
  const numQ     = document.getElementById("numQuestions").value;        // "5", "10", or "15"

  // Hide any old error
  document.getElementById("setupError").classList.add("d-none");

  // Validation
  if (!title) {
    showSetupError("Please enter a quiz title.");
    return;
  }
  if (!category) {
    showSetupError("Please select a category (Java or Python).");
    return;
  }

  showLoading("Creating your quiz...");

  try {
    // POST to backend — parameters go in the URL as query params
    const response = await fetch(
      `${BASE_URL}/quiz/create?category=${category}&numQ=${numQ}&title=${encodeURIComponent(title)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }
    );

    if (!response.ok) {
      throw new Error("Could not create quiz. Check if the backend is running.");
    }

    // Backend returns the quiz ID (integer) — requires the backend fix
    const quizId = await response.json();
    currentQuizId = quizId;

    // Load the questions for this quiz
    await loadQuestions(quizId, title, numQ);

  } catch (error) {
    hideLoading();
    showSetupError(error.message);
  }
}


// ==================================================================
// STEP 2 — loadQuestions(quizId, title, numQ)
//   GET /quiz/get/{id} → builds HTML for each question
//   Only shows exactly numQ questions (backend already limits this)
// ==================================================================
async function loadQuestions(quizId, title, numQ) {

  showLoading("Loading questions...");

  try {
    const response = await fetch(`${BASE_URL}/quiz/get/${quizId}`);

    if (!response.ok) {
      throw new Error("Failed to load questions. Try again.");
    }

    // Array of question objects: {id, questionTitle, option1..4}
    const questions = await response.json();
    totalQuestions = questions.length;   // actual count from backend

    // Hide setup form, show questions section
    document.getElementById("setupSection").classList.add("d-none");
    document.getElementById("questionsSection").classList.remove("d-none");

    // Set the header text
    document.getElementById("quizTitleDisplay").textContent = title;
    document.getElementById("quizSubtitle").textContent =
      `Answer all ${totalQuestions} questions, then click Submit.`;

    // Build a card for each question
    const container = document.getElementById("questionsContainer");
    container.innerHTML = "";

    questions.forEach(function(question, index) {

      const card = document.createElement("div");
      card.className = "question-card";
      card.dataset.questionId = question.id;   // store ID for later

      // Build the inner HTML for this question card
      card.innerHTML = `
        <div class="question-number">Question ${index + 1} of ${totalQuestions}</div>
        <div class="question-title">${question.questionTitle}</div>
        <div class="options-group">

          <label class="option-label">
            <input type="radio" name="q_${question.id}" value="${question.option1}" />
            ${question.option1}
          </label>

          <label class="option-label">
            <input type="radio" name="q_${question.id}" value="${question.option2}" />
            ${question.option2}
          </label>

          <label class="option-label">
            <input type="radio" name="q_${question.id}" value="${question.option3}" />
            ${question.option3}
          </label>

          <label class="option-label">
            <input type="radio" name="q_${question.id}" value="${question.option4}" />
            ${question.option4}
          </label>

        </div>
      `;

      container.appendChild(card);
    });

    hideLoading();

  } catch (error) {
    hideLoading();
    showSetupError(error.message);
    // Show setup form again so user can retry
    document.getElementById("setupSection").classList.remove("d-none");
    document.getElementById("questionsSection").classList.add("d-none");
  }
}


// ==================================================================
// STEP 3 — submitQuiz()
//   Collects answers, POST to /quiz/submit/{id}
//   Backend returns score as integer
// ==================================================================
function submitQuiz() {

  const container = document.getElementById("questionsContainer");
  const questionCards = container.querySelectorAll(".question-card");

  const responses = [];
  let unanswered = 0;

  // Collect selected answer from each card
  questionCards.forEach(function(card) {
    const questionId = parseInt(card.dataset.questionId);
    const selected   = card.querySelector("input[type='radio']:checked");

    if (selected) {
      responses.push({ id: questionId, response: selected.value });
    } else {
      unanswered++;
    }
  });

  // Warn if unanswered questions exist
  if (unanswered > 0) {
    const ok = confirm(
      `You have ${unanswered} unanswered question(s).\n` +
      `They will be marked as wrong.\n\nSubmit anyway?`
    );
    if (!ok) return;

    // Add empty responses for unanswered questions
    questionCards.forEach(function(card) {
      const questionId = parseInt(card.dataset.questionId);
      const alreadyIn  = responses.find(r => r.id === questionId);
      if (!alreadyIn) {
        responses.push({ id: questionId, response: "" });
      }
    });
  }

  showLoading("Calculating your score...");

  // POST the answers to the backend
  fetch(`${BASE_URL}/quiz/submit/${currentQuizId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(responses)
  })
  .then(function(res) {
    if (!res.ok) throw new Error("Failed to submit. Please try again.");
    return res.json();   // returns an integer score
  })
  .then(function(score) {
    hideLoading();
    showResult(score, totalQuestions);
  })
  .catch(function(err) {
    hideLoading();
    alert("Error: " + err.message);
  });
}


// ==================================================================
// showResult(score, total)
//   Hides questions, displays the result card with score + bar
// ==================================================================
function showResult(score, total) {

  document.getElementById("questionsSection").classList.add("d-none");
  document.getElementById("resultSection").classList.remove("d-none");

  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  // Fill in numbers
  document.getElementById("scoreDisplay").textContent      = score;
  document.getElementById("scoreLabelDisplay").textContent = "out of " + total;
  document.getElementById("scorePercent").textContent      = percent + "%";

  // Animate score bar
  const bar = document.getElementById("scoreBar");
  bar.style.width = percent + "%";

  // Pick color + message based on score
  const alertBox   = document.getElementById("resultAlert");
  const resultMsg  = document.getElementById("resultMessage");
  const resultIcon = document.getElementById("resultIcon");
  const resultTitle= document.getElementById("resultTitle");

  if (percent >= 80) {
    bar.classList.add("bg-success");
    alertBox.className   = "alert alert-success mb-4";
    resultIcon.textContent  = "🏆";
    resultTitle.textContent = "Excellent Work!";
    resultMsg.textContent   = "Outstanding! You really know your stuff!";
  } else if (percent >= 60) {
    bar.classList.add("bg-primary");
    alertBox.className   = "alert alert-primary mb-4";
    resultIcon.textContent  = "👍";
    resultTitle.textContent = "Good Job!";
    resultMsg.textContent   = "Well done! A little more practice and you'll ace it!";
  } else if (percent >= 40) {
    bar.classList.add("bg-warning");
    alertBox.className   = "alert alert-warning mb-4";
    resultIcon.textContent  = "📚";
    resultTitle.textContent = "Keep Practicing!";
    resultMsg.textContent   = "Not bad, but there's room to improve. Keep studying!";
  } else {
    bar.classList.add("bg-danger");
    alertBox.className   = "alert alert-danger mb-4";
    resultIcon.textContent  = "💪";
    resultTitle.textContent = "Keep Going!";
    resultMsg.textContent   = "Don't give up! Review the topic and try again.";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}


// ==================================================================
// resetQuiz() — resets everything back to the setup form
// ==================================================================
function resetQuiz() {
  currentQuizId  = null;
  totalQuestions = 0;

  document.getElementById("quizTitle").value    = "";
  document.getElementById("quizCategory").value = "";
  document.getElementById("numQuestions").value = "10";
  document.getElementById("questionsContainer").innerHTML = "";

  // Reset progress bar
  const bar = document.getElementById("scoreBar");
  bar.style.width = "0%";
  bar.className   = "progress-bar progress-bar-striped";

  document.getElementById("setupError").classList.add("d-none");
  document.getElementById("setupSection").classList.remove("d-none");
  document.getElementById("questionsSection").classList.add("d-none");
  document.getElementById("resultSection").classList.add("d-none");

  window.scrollTo({ top: 0, behavior: "smooth" });
}


// ==================================================================
// HELPER FUNCTIONS
// ==================================================================
function showSetupError(message) {
  document.getElementById("setupErrorMsg").textContent = message;
  document.getElementById("setupError").classList.remove("d-none");
}

function showLoading(message) {
  document.getElementById("loadingMsg").textContent = message || "Loading...";
  document.getElementById("loadingOverlay").classList.remove("d-none");
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("d-none");
}