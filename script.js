// API Configuration
const apiKey = "AIzaSyARWEu4Y-VbI8N1AlTWVBIo4ZUD2gPy0Wo";
const sheetId = "1wE0KJlSkhaTFMTcjDj3t_rpp3SOHmn6hrSZeoIwcNzw"; // Replace with your SSCE sheet ID
const sheetURL =
  "https://script.google.com/macros/s/AKfycbyvp2YeF59W4dI2L7ck9dsbK1SsKjMDcZhegGibwtZbdljkIRygbYjpOpkAyLvVUaGUqA/exec";

// Helper Functions
function getSheetName(subject, stream) {
  return `${subject.replace(/\s+/g, "")}_${
    stream.charAt(0).toUpperCase() + stream.slice(1)
  }`;
}

// Global variable for hint tracking across the entire exam
let totalHintsUsed = 0;
const MAX_TOTAL_HINTS = 5;

// Fetch and Display Questions
async function fetchQuestions(stream, subject) {
  if (!subject || !stream) {
    alert("Please select a subject and stream.");
    return;
  }

  console.log("Fetching questions for:", { stream, subject });

  const sheetName = getSheetName(subject, stream);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;

  try {
    console.log("Fetching from URL:", url);
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values) {
      console.error("No values found in response:", data);
      throw new Error(`No sheet found for ${sheetName}`);
    }

    console.log(`Found ${data.values.length} rows of data`);

    // Reset hints when loading new questions
    totalHintsUsed = 0;

    displayQuestions(data.values, subject, stream);

    // Start the timer after questions are displayed
    startTimer();
  } catch (error) {
    console.error("Error fetching questions:", error);
    document.getElementById("questions").innerHTML = `
      <p class="error"> ${subject.replace(
        /_/g,
        " "
      )} questions for ${stream} stream are not yet available.</p>
      <p class="error">Please select a different subject or try again later.</p>
      <button onclick="window.location.href='index.html'" class="sub-btn">Go Back</button>
    `;
  }
}

// Store questions data globally
let questionsData = [];

// Display questions in HTML
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function displayQuestions(data, subject, stream) {
  const questionsDiv = document.getElementById("questions");
  questionsDiv.innerHTML = "";
  questionsData = [];

  if (!data || data.length <= 1) {
    questionsDiv.innerHTML = "<p>No questions found.</p>";
    return;
  }
  // Separate header row and question rows
  const headerRow = data[0];
  const questionRows = data.slice(1);

  // Shuffle only the question rows, keeping the header row intact
  const shuffledQuestionRows = shuffleArray(questionRows);

  // Limit to 50 questions for SSCE format
  const limitedQuestionRows = shuffledQuestionRows.slice(0, 20);

  // Get username from localStorage
  const userFullName =
    localStorage.getItem("userFullName") ||
    localStorage.getItem("userName") ||
    "Student";

  // Add exam metadata section
  questionsDiv.innerHTML = `
     <div class="exam-header">
    <h3>Subject: ${subject.replace(/_/g, " ")}</h3>
    <h4>Stream: ${stream.charAt(0).toUpperCase() + stream.slice(1)}</h4>
    <h3>Student: ${userFullName}</h3>
    <h3 class="Warn">Answer all questions before the time runs out.</h3>
  </div>
  `;

  // Create questions
  for (let i = 0; i < limitedQuestionRows.length; i++) {
    const row = limitedQuestionRows[i];
    const questionText = row[0];
    const options = {
      A: row[1],
      B: row[2],
      C: row[3],
      D: row[4],
    };
    const correctAnswer = row[5];

    // Get the question type (column H) which contains the hint
    const questionHint = row[6] || "";

    // Shuffle the options while maintaining the correct mapping
    const optionKeys = ["A", "B", "C", "D"];
    const shuffledOptionKeys = shuffleArray([...optionKeys]);

    // Create shuffled options object
    const shuffledOptions = {};
    shuffledOptionKeys.forEach((newKey, index) => {
      shuffledOptions[newKey] = options[optionKeys[index]];
    });

    // Find the new key for the correct answer
    const newCorrectAnswerKey =
      shuffledOptionKeys[optionKeys.indexOf(correctAnswer)];

    // Process the question text to extract and handle image URLs
    const { processedText, imageHtmlContent } = processQuestionImages(
      questionText,
      i
    );

    // Create a unique ID for this question
    const questionId = `q${i + 1}`;

    // Get the explanation from column I
    const questionExplanation =
      row[7] || "No explanation available for this question.";

    questionsData.push({
      questionNumber: i + 1,
      questionText: processedText,
      options: shuffledOptions,
      correctAnswer: newCorrectAnswerKey,
      subject,
      stream,
      topic: categorizeQuestionByTopic(processedText, subject, stream),
      hint: questionHint, // Store the hint from column H
      questionId: questionId,
      explanation: questionExplanation, // Store the explanation from column I
    });

    // Create the hint character HTML - initial state is always standing
    const hintCharacterHTML = `
      <div class="character-wrapper" data-question-id="${questionId}">
        <img src="assets/standing.png" alt="Hint Character" class="hint-character" id="character-${questionId}">
        <div class="speech-bubble" id="hint-bubble-${questionId}">
          Click for a hint!
        </div>
      </div>
    `;

    const questionHTML = `
      <div class="question-container">
        <p class="question-text"><strong>Question ${
          i + 1
        }:</strong> ${processedText}</p>
        ${imageHtmlContent}
        
        ${hintCharacterHTML}
        
        <div class="options-container">
          ${Object.entries(shuffledOptions)
            .map(
              ([key, value]) => `
            <label class="option-label">
              <input type="radio" name="q${i + 1}" value="${key}" required> 
               ${value}
            </label>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    questionsDiv.innerHTML += questionHTML;
  }

  // Add submit button
  questionsDiv.innerHTML += `
    <button onclick="checkAnswers()" class="submit-btn">Submit Exam</button>
  `;

  // Add this line to set up the listeners for removing the "unanswered" class
  addRadioChangeListeners();

  // Setup image error handling
  setupImageErrorHandling();

  // Setup hint character interactions
  setupHintCharacters();

  // Add hint counter display
  addHintCounterDisplay();
}

// Add hint counter display
function addHintCounterDisplay() {
  // Create a hint counter element
  const hintCounter = document.createElement("div");
  hintCounter.id = "hint-counter";
  hintCounter.className = "hint-counter";
  hintCounter.innerHTML = `Hints: <span>${
    MAX_TOTAL_HINTS - totalHintsUsed
  }</span> remaining`;

  // Add it to the page
  document
    .querySelector(".container")
    .insertBefore(hintCounter, document.querySelector(".progress-bar"));

  // Update the counter display
  updateHintCounter();
}

// Update hint counter display
function updateHintCounter() {
  const hintCounter = document.getElementById("hint-counter");
  if (hintCounter) {
    hintCounter.innerHTML = `Hints: <span>${
      MAX_TOTAL_HINTS - totalHintsUsed
    }</span> remaining`;

    // Add warning class if running low on hints
    if (MAX_TOTAL_HINTS - totalHintsUsed <= 1) {
      hintCounter.classList.add("hint-counter-warning");
    }
  }
}

// Helper function to process question images - handles both regular and Google Drive images
function processQuestionImages(questionText, questionNumber) {
  let processedText = questionText;
  let imageHtmlContent = "";

  // Regular expression for standard image URLs
  const standardImageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;

  // Regular expression for Google Drive links
  const googleDriveRegex =
    /(https?:\/\/drive\.google\.com\/file\/d\/([^/\s]+)\/view[^\s]*|https?:\/\/drive\.google\.com\/open\?id=([^\s&]+))/gi;

  // First check for Google Drive links
  const driveMatches = [...questionText.matchAll(googleDriveRegex)];

  if (driveMatches && driveMatches.length > 0) {
    for (const match of driveMatches) {
      const fullUrl = match[0];
      // Extract fileId from the URL - either from /d/FILEID/view or ?id=FILEID
      const fileId = match[2] || match[3];

      if (fileId) {
        // Create a direct link for the image
        // This format allows direct image embedding from Google Drive
        const directImageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        // Replace the Google Drive URL in the question text
        processedText = processedText.replace(fullUrl, "");

        // Create image HTML
        imageHtmlContent += `<div class="question-image-container">
          <img src="${directImageUrl}" alt="Question ${questionNumber} image" class="question-image" data-source="google-drive">
        </div>`;
      }
    }
  }
  // If no Google Drive links, check for standard image URLs
  else {
    const standardMatches = [...questionText.matchAll(standardImageRegex)];

    if (standardMatches && standardMatches.length > 0) {
      for (const match of standardMatches) {
        const imageUrl = match[0];

        // Replace the URL in the question text
        processedText = processedText.replace(imageUrl, "");

        // Create image HTML
        imageHtmlContent += `<div class="question-image-container">
          <img src="${imageUrl}" alt="Question ${questionNumber} image" class="question-image">
        </div>`;
      }
    }
  }

  return { processedText, imageHtmlContent };
}

// Function to handle image loading errors
function setupImageErrorHandling() {
  document.querySelectorAll(".question-image").forEach((img) => {
    img.onerror = function () {
      this.onerror = null;

      // Custom message for Google Drive images
      const errorMessage =
        this.dataset.source === "google-drive"
          ? "Google Drive image could not be loaded. Make sure the file is publicly accessible."
          : "Image could not be loaded";

      this.parentNode.innerHTML = `
        <div class="image-error">
          <p>${errorMessage}</p>
          <small>${this.src}</small>
        </div>
      `;
    };
  });
}

// Setup hint character interactions
function setupHintCharacters() {
  document.querySelectorAll(".character-wrapper").forEach((character) => {
    const questionId = character.dataset.questionId;
    const characterImg = character.querySelector(".hint-character");
    const speechBubble = character.querySelector(".speech-bubble");

    character.addEventListener("click", () => {
      // Check if we've used all hints for the entire exam
      if (totalHintsUsed >= MAX_TOTAL_HINTS) {
        // Update all characters to lying down
        document.querySelectorAll(".hint-character").forEach((img) => {
          img.src = "assets/standing.png";
        });

        speechBubble.textContent = "I'm tired. No more hints for this exam!";
        speechBubble.classList.add("show");

        // Hide the bubble after 3 seconds
        setTimeout(() => {
          speechBubble.classList.remove("show");
        }, 12000);

        return;
      }

      // Get the question data
      const questionData = questionsData.find(
        (q) => q.questionId === questionId
      );

      // Check if we have a hint for this question
      if (
        !questionData ||
        !questionData.hint ||
        questionData.hint.trim() === ""
      ) {
        speechBubble.textContent = "No hints available for this question.";
        speechBubble.classList.add("show");

        // Hide the bubble after 3 seconds
        setTimeout(() => {
          speechBubble.classList.remove("show");
        }, 5000);

        return;
      }

      // Hide all other speech bubbles first
      document.querySelectorAll(".speech-bubble").forEach((bubble) => {
        if (bubble.id !== `hint-bubble-${questionId}`) {
          bubble.classList.remove("show");
        }
      });

      // Switch to thinking character
      characterImg.src = "assets/thinking.png";

      // Display the hint from column H
      speechBubble.textContent = questionData.hint;
      speechBubble.classList.add("show");

      // Increment the total hint counter
      totalHintsUsed++;

      // Update the hint counter display
      updateHintCounter();

      // If this was the last allowed hint, update all characters to lying down
      if (totalHintsUsed >= MAX_TOTAL_HINTS) {
        setTimeout(() => {
          document.querySelectorAll(".hint-character").forEach((img) => {
            img.src = "assets/standing.png";
          });
        }, 5000);
      } else {
        // Otherwise, switch back to standing after 2 seconds
        setTimeout(() => {
          characterImg.src = "assets/standing.png";
        }, 5000);
      }

      // Hide the bubble after 5 seconds
      setTimeout(() => {
        speechBubble.classList.remove("show");
      }, 5000);
    });
  });

  // Hide all speech bubbles when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".character-wrapper")) {
      document.querySelectorAll(".speech-bubble").forEach((bubble) => {
        bubble.classList.remove("show");
      });
    }
  });
}

// Check answers and calculate score
// Function to check answers with validation for unanswered questions
function checkAnswers() {
  // Get the submit button
  const submitBtn = document.querySelector(".submit-btn");

  // Display loading state
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
  submitBtn.disabled = true;

  // Clear the timer interval if it exists
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Get username from localStorage
  const username =
    localStorage.getItem("userFullName") ||
    localStorage.getItem("userName") ||
    "Unknown Student";

  // Proceed with calculating score and submitting
  let score = 0;
  const responses = [];
  const totalQuestions = questionsData.length;

  questionsData.forEach((q, index) => {
    const selected = document.querySelector(
      `input[name="q${index + 1}"]:checked`
    );
    const isCorrect = selected && selected.value === q.correctAnswer;
    if (isCorrect) score++;

    responses.push({
      questionNumber: index + 1,
      questionText: q.questionText || `Question ${index + 1}`,
      options: q.options || {},
      selectedAnswer: selected ? selected.value : null,
      correctAnswer: q.correctAnswer,
      correct: isCorrect,
      topic: q.topic || "General",
      explanation: q.explanation || "No explanation available.",
    });
  });

  // Prepare result data
  const resultData = {
    timestamp: new Date().toISOString(),
    name: username,
    subject:
      localStorage.getItem("examSubject") ||
      document.getElementById("subject").value,
    stream: localStorage.getItem("examStream") || "science",
    score: score,
    totalQuestions: totalQuestions,
    percentage: ((score / totalQuestions) * 100).toFixed(1),
    responses: responses,
  };

  // Save to appropriate sheet
  saveResult(resultData);
}

// Save result to Google Sheets
async function saveResult(resultData) {
  try {
    // Create a copy of resultData with stringified responses for the API
    const apiData = {
      ...resultData,
      responses: JSON.stringify(resultData.responses),
    };

    const response = await fetch(sheetURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(
        JSON.stringify({
          ...apiData,
          sheetName: getSheetName(resultData.subject, resultData.stream),
        })
      )}`,
    });

    // Check response status
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Add a small delay to ensure data is saved
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Save exam data for analytics
    saveExamDataForAnalytics(resultData);

    displayResults(resultData);
  } catch (error) {
    console.error("Error saving result:", error);
    alert(
      "There was an issue displaying the results, but your answers have been recorded successfully."
    );
  }
}

// Save exam data for analytics
function saveExamDataForAnalytics(resultData) {
  // Get existing exam data array or initialize new one
  const examHistory = JSON.parse(localStorage.getItem("examHistory") || "[]");

  // Add new exam data
  examHistory.push({
    id: Date.now(), // Use timestamp as ID
    date: new Date().toISOString(),
    subject: resultData.subject,
    stream: resultData.stream,
    score: Number.parseInt(resultData.percentage),
    totalQuestions: resultData.totalQuestions,
    correctAnswers: resultData.score,
    timeSpent: document.getElementById("time-remaining")
      ? 60 * 60 -
        Number.parseInt(
          document.getElementById("time-remaining").textContent.split(":")[0]
        ) *
          60 -
        Number.parseInt(
          document.getElementById("time-remaining").textContent.split(":")[1]
        ) +
        ":00"
      : "45:00",
    responses: resultData.responses.map((response) => ({
      topic: response.topic || "General",
      correct: response.correct ? 1 : 0,
      total: 1,
    })),
  });

  // Save back to localStorage
  localStorage.setItem("examHistory", JSON.stringify(examHistory));
}

// Display final results
function displayResults(resultData) {
  const questionsDiv = document.getElementById("questions");

  // Calculate grade based on percentage
  const percentage = Number.parseFloat(resultData.percentage);
  let grade, gradeColor;

  if (percentage >= 81) {
    grade = "A+";
    gradeColor = "var(--grade-a-plus)";
  } else if (percentage >= 71) {
    grade = "A";
    gradeColor = "var(--grade-a)";
  } else if (percentage >= 66) {
    grade = "B+";
    gradeColor = "var(--grade-b-plus)";
  } else if (percentage >= 61) {
    grade = "B";
    gradeColor = "var(--grade-b)";
  } else if (percentage >= 56) {
    grade = "C+";
    gradeColor = "var(--grade-c-plus)";
  } else if (percentage >= 51) {
    grade = "C";
    gradeColor = "var(--grade-c)";
  } else if (percentage >= 46) {
    grade = "D+";
    gradeColor = "var(--grade-d-plus)";
  } else if (percentage >= 41) {
    grade = "D";
    gradeColor = "var(--grade-d)";
  } else if (percentage >= 36) {
    grade = "E+";
    gradeColor = "var(--grade-e-plus)";
  } else if (percentage >= 31) {
    grade = "E";
    gradeColor = "var(--grade-e)";
  } else {
    grade = "F";
    gradeColor = "var(--grade-f)";
  }

  // Store responses in localStorage for review page
  localStorage.setItem("examResponses", JSON.stringify(resultData.responses));
  localStorage.setItem("examSubjectResult", resultData.subject);
  localStorage.setItem("examStreamResult", resultData.stream);

  questionsDiv.innerHTML = `
    <div class="results-container">
      <h2><strong>${resultData.name}</strong>, Well done on your practice exam!</h2>
      <div class="results-summary">
        <p>Keep practicing consistently to improve your SSCE performance.</p>
        <div class="score-display">
        <h3 class="Grade"><span style="color: ${gradeColor}; text-shadow:${gradeColor} 2px 2px 5px;
font-weight: bold;">${grade}</span></h3>
          <h3>Your Score: <span>${resultData.score}/${resultData.totalQuestions}</span></h3>
          <h3>Percentage: <span>${resultData.percentage}%</span></h3>
        </div>
      </div>
      <div class="results-actions">
        <button onclick="window.location.href='review.html'" class="review-btn">Review Answers</button>
        <button onclick="window.location.href='index.html'" class="submit-btn">Take Another Exam</button>
      </div>
    </div>
  `;

  // Clear the stored exam details
  localStorage.removeItem("examStream");
  localStorage.removeItem("examSubject");

  // Make sure timer is stopped
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Timer functionality
const examDuration = 60 * 60; // 60 minutes in seconds for SSCE format
let timerInterval;

// Update the timer's time-up handler to ensure it properly submits
function startTimer() {
  const timerElement = document.getElementById("time-remaining");
  let timeLeft = examDuration;

  // Update timer immediately
  updateTimerDisplay(timeLeft);

  timerInterval = setInterval(() => {
    timeLeft--;

    // Update the timer display
    updateTimerDisplay(timeLeft);

    // Update progress bar
    const progressPercent = 100 - (timeLeft / examDuration) * 100;
    document.querySelector(
      ".progress-bar-fill"
    ).style.width = `${progressPercent}%`;

    // When time runs out
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert("Time's up! Your exam will be submitted now.");
      checkAnswers(); // This will now work even with unanswered questions
    }

    // Warning when 15 minutes remaining
    if (timeLeft === 900) {
      showTimerWarning("15 Minutes Remaining!");
    }
    // Warning when 5 minutes remaining
    if (timeLeft === 300) {
      showTimerWarning("5 minutes remaining!");
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  document.getElementById("time-remaining").textContent = `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;

  // Change color when less than 15 minutes remaining
  if (seconds < 900) {
    document.getElementById("time-remaining").style.color = "orange";
  }
  // Change color when less than 5 minutes remaining
  if (seconds < 300) {
    document.getElementById("time-remaining").style.color = "#ef4444";
  }
}

function showTimerWarning(message) {
  // Create a warning toast
  const toast = document.createElement("div");
  toast.className = "toast toast-warning";
  toast.innerHTML = message;
  document.body.appendChild(toast);

  // Remove toast after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Add this to clear timer when exam is submitted
function addRadioChangeListeners() {
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      // Find the question container
      const questionContainer = e.target.closest(".question-container");
      if (questionContainer) {
        questionContainer.classList.remove("unanswered");
      }
    });
  });
}

// Add this function to categorize questions by topic based on subject and stream
function categorizeQuestionByTopic(questionText, subject, stream) {
  // Convert question to lowercase for case-insensitive matching
  const lowerQuestion = questionText.toLowerCase();

  // Define subject-specific topic keywords
  const topicKeywords = {
    // Core subjects
    English: {
      Grammar: [
        "noun",
        "verb",
        "adjective",
        "adverb",
        "pronoun",
        "preposition",
        "tense",
        "punctuation",
      ],
      Comprehension: [
        "passage",
        "read the",
        "according to the",
        "author",
        "paragraph",
        "text",
      ],
      Vocabulary: ["meaning", "synonym", "antonym", "define", "definition"],
      "Oral English": [
        "sound",
        "pronunciation",
        "phonetics",
        "stress",
        "intonation",
        "syllable",
      ],
    },
    Mathematics: {
      Algebra: [
        "equation",
        "solve for",
        "expression",
        "variable",
        "formula",
        "algebraic",
      ],
      Geometry: [
        "shape",
        "angle",
        "triangle",
        "circle",
        "rectangle",
        "area",
        "perimeter",
        "volume",
      ],
      Arithmetic: [
        "add",
        "subtract",
        "multiply",
        "divide",
        "fraction",
        "decimal",
        "percentage",
      ],
      Statistics: [
        "mean",
        "median",
        "mode",
        "average",
        "probability",
        "data",
        "chart",
        "graph",
      ],
      "Number Bases": ["binary", "octal", "hexadecimal", "base", "conversion"],
    },
    Civic_Education: {
      "National Values": [
        "value",
        "patriotism",
        "loyalty",
        "honesty",
        "integrity",
        "discipline",
      ],
      "Rights and Duties": [
        "right",
        "duty",
        "responsibility",
        "obligation",
        "citizen",
        "freedom",
      ],
      "National Symbols": [
        "flag",
        "anthem",
        "pledge",
        "coat of arms",
        "currency",
        "national",
      ],
      Democracy: [
        "democracy",
        "election",
        "vote",
        "government",
        "constitution",
        "political",
      ],
    },

    // Science subjects
    Physics: {
      Mechanics: [
        "force",
        "motion",
        "velocity",
        "acceleration",
        "momentum",
        "newton",
        "mass",
      ],
      "Heat and Energy": [
        "heat",
        "temperature",
        "energy",
        "thermal",
        "thermodynamics",
      ],
      "Waves and Sound": [
        "wave",
        "frequency",
        "amplitude",
        "sound",
        "vibration",
        "oscillation",
      ],
      "Light and Optics": [
        "light",
        "reflection",
        "refraction",
        "lens",
        "mirror",
        "optics",
      ],
      Electricity: [
        "electric",
        "current",
        "voltage",
        "resistance",
        "circuit",
        "ohm",
      ],
      Magnetism: [
        "magnet",
        "magnetic",
        "field",
        "flux",
        "pole",
        "attract",
        "repel",
      ],
    },
    Chemistry: {
      "Atomic Structure": [
        "atom",
        "electron",
        "proton",
        "neutron",
        "nucleus",
        "orbital",
      ],
      "Chemical Bonding": [
        "bond",
        "ionic",
        "covalent",
        "metallic",
        "electronegativity",
      ],
      "Acids and Bases": ["acid", "base", "pH", "alkali", "neutralization"],
      "Organic Chemistry": [
        "organic",
        "carbon",
        "hydrocarbon",
        "alkane",
        "alkene",
        "alcohol",
      ],
      "Chemical Reactions": [
        "reaction",
        "reactant",
        "product",
        "catalyst",
        "equilibrium",
      ],
      "Periodic Table": [
        "periodic",
        "element",
        "group",
        "period",
        "metal",
        "non-metal",
      ],
    },
    Biology: {
      "Cell Biology": ["cell", "membrane", "nucleus", "organelle", "cytoplasm"],
      "Human Anatomy": [
        "organ",
        "system",
        "tissue",
        "heart",
        "lung",
        "kidney",
        "brain",
      ],
      Genetics: ["gene", "dna", "chromosome", "heredity", "mutation", "allele"],
      Ecology: [
        "ecosystem",
        "habitat",
        "population",
        "community",
        "food chain",
      ],
      "Plant Biology": [
        "plant",
        "photosynthesis",
        "root",
        "stem",
        "leaf",
        "flower",
      ],
      "Animal Biology": [
        "animal",
        "respiration",
        "circulation",
        "digestion",
        "excretion",
      ],
    },
    Further_Mathematics: {
      "Advanced Algebra": [
        "matrix",
        "determinant",
        "vector",
        "complex number",
        "quadratic",
      ],
      Calculus: [
        "differentiation",
        "integration",
        "derivative",
        "integral",
        "limit",
      ],
      "Coordinate Geometry": [
        "coordinate",
        "locus",
        "circle",
        "ellipse",
        "parabola",
        "hyperbola",
      ],
      Mechanics: [
        "dynamics",
        "statics",
        "equilibrium",
        "projectile",
        "friction",
      ],
      Statistics: [
        "probability",
        "distribution",
        "correlation",
        "regression",
        "hypothesis",
      ],
    },
    Geography: {
      "Physical Geography": [
        "landform",
        "climate",
        "weather",
        "soil",
        "vegetation",
        "erosion",
      ],
      "Human Geography": [
        "population",
        "settlement",
        "urbanization",
        "migration",
        "development",
      ],
      "Regional Geography": [
        "region",
        "country",
        "continent",
        "africa",
        "asia",
        "europe",
      ],
      Cartography: [
        "map",
        "scale",
        "projection",
        "coordinate",
        "latitude",
        "longitude",
      ],
      "Environmental Geography": [
        "environment",
        "pollution",
        "conservation",
        "resource",
        "sustainable",
      ],
    },
    Agriculture: {
      "Crop Production": [
        "crop",
        "plant",
        "cultivation",
        "harvest",
        "fertilizer",
        "pesticide",
      ],
      "Animal Husbandry": [
        "animal",
        "livestock",
        "breeding",
        "feed",
        "veterinary",
        "poultry",
      ],
      "Agricultural Economics": [
        "market",
        "price",
        "demand",
        "supply",
        "cost",
        "profit",
      ],
      "Soil Science": [
        "soil",
        "fertility",
        "erosion",
        "conservation",
        "nutrient",
        "ph",
      ],
      "Farm Management": [
        "farm",
        "management",
        "planning",
        "record",
        "budget",
        "enterprise",
      ],
    },

    // Arts subjects
    Literature: {
      Poetry: [
        "poem",
        "verse",
        "stanza",
        "rhyme",
        "meter",
        "imagery",
        "metaphor",
      ],
      Drama: [
        "play",
        "act",
        "scene",
        "character",
        "dialogue",
        "stage",
        "tragedy",
        "comedy",
      ],
      Prose: [
        "novel",
        "short story",
        "narrative",
        "plot",
        "setting",
        "protagonist",
        "antagonist",
      ],
      "Literary Analysis": [
        "theme",
        "motif",
        "symbol",
        "style",
        "tone",
        "mood",
        "perspective",
      ],
    },
    Government: {
      "Political Systems": [
        "democracy",
        "autocracy",
        "monarchy",
        "republic",
        "federal",
        "unitary",
      ],
      Constitution: [
        "constitution",
        "amendment",
        "rights",
        "freedom",
        "law",
        "judiciary",
      ],
      "Government Structures": [
        "executive",
        "legislative",
        "judicial",
        "president",
        "parliament",
      ],
      "International Relations": [
        "diplomacy",
        "foreign policy",
        "international",
        "treaty",
        "organization",
      ],
    },
    History: {
      "Ancient History": [
        "ancient",
        "civilization",
        "empire",
        "kingdom",
        "dynasty",
        "archaeology",
      ],
      "Medieval History": [
        "medieval",
        "middle ages",
        "feudal",
        "castle",
        "knight",
        "crusade",
      ],
      "Modern History": [
        "modern",
        "revolution",
        "industrial",
        "world war",
        "colonial",
        "independence",
      ],
      "African History": [
        "africa",
        "kingdom",
        "empire",
        "colonial",
        "independence",
        "apartheid",
      ],
      "Nigerian History": [
        "nigeria",
        "amalgamation",
        "independence",
        "civil war",
        "military",
        "democracy",
      ],
    },
    Music: {
      "Music Theory": [
        "note",
        "scale",
        "key",
        "chord",
        "harmony",
        "rhythm",
        "melody",
      ],
      "Music History": [
        "period",
        "baroque",
        "classical",
        "romantic",
        "contemporary",
        "composer",
      ],
      "African Music": [
        "traditional",
        "folk",
        "instrument",
        "dance",
        "cultural",
        "ritual",
      ],
      "Music Appreciation": [
        "genre",
        "style",
        "form",
        "analysis",
        "interpretation",
        "performance",
      ],
    },
    French: {
      Grammar: [
        "verb",
        "noun",
        "adjective",
        "adverb",
        "tense",
        "conjugation",
        "article",
      ],
      Vocabulary: [
        "word",
        "meaning",
        "expression",
        "phrase",
        "idiom",
        "definition",
      ],
      Comprehension: [
        "passage",
        "text",
        "read",
        "understand",
        "interpret",
        "analyze",
      ],
      "Oral French": [
        "pronunciation",
        "accent",
        "speaking",
        "listening",
        "conversation",
        "dialogue",
      ],
    },

    // Commerce subjects
    Commerce: {
      Trade: [
        "buying",
        "selling",
        "wholesale",
        "retail",
        "import",
        "export",
        "distribution",
      ],
      "Commercial Documents": [
        "invoice",
        "receipt",
        "voucher",
        "cheque",
        "bill",
        "document",
      ],
      "Business Organizations": [
        "sole proprietorship",
        "partnership",
        "company",
        "corporation",
        "enterprise",
      ],
      Marketing: [
        "market",
        "product",
        "price",
        "promotion",
        "distribution",
        "consumer",
      ],
      Insurance: [
        "policy",
        "premium",
        "risk",
        "claim",
        "indemnity",
        "insurer",
        "insured",
      ],
    },
    Financial_Accounting: {
      "Basic Accounting": [
        "debit",
        "credit",
        "journal",
        "ledger",
        "trial balance",
        "double entry",
      ],
      "Financial Statements": [
        "balance sheet",
        "income statement",
        "cash flow",
        "equity",
        "asset",
        "liability",
      ],
      "Cost Accounting": [
        "cost",
        "overhead",
        "direct",
        "indirect",
        "variance",
        "budget",
      ],
      Taxation: [
        "tax",
        "vat",
        "income tax",
        "capital gains",
        "deduction",
        "exemption",
      ],
    },
    Economics: {
      Microeconomics: [
        "demand",
        "supply",
        "market",
        "price",
        "consumer",
        "producer",
        "equilibrium",
      ],
      Macroeconomics: [
        "gdp",
        "inflation",
        "unemployment",
        "fiscal",
        "monetary",
        "policy",
      ],
      "International Trade": [
        "trade",
        "import",
        "export",
        "tariff",
        "quota",
        "exchange rate",
      ],
      "Development Economics": [
        "development",
        "poverty",
        "growth",
        "sustainable",
        "inequality",
      ],
    },
    Data_Processing: {
      "Computer Fundamentals": [
        "hardware",
        "software",
        "input",
        "output",
        "processing",
        "storage",
      ],
      "Data Representation": [
        "data",
        "information",
        "binary",
        "bit",
        "byte",
        "code",
        "format",
      ],
      "Software Applications": [
        "application",
        "program",
        "spreadsheet",
        "database",
        "word processor",
      ],
      "Internet and Networks": [
        "internet",
        "network",
        "web",
        "email",
        "protocol",
        "server",
        "client",
      ],
      Programming: [
        "algorithm",
        "flowchart",
        "code",
        "program",
        "language",
        "syntax",
        "logic",
      ],
    },
  };

  // Get the topics for the current subject
  const subjectTopics = topicKeywords[subject.replace(/_/g, "_")] || {};

  // Check for each topic's keywords
  for (const [topic, keywords] of Object.entries(subjectTopics)) {
    for (const keyword of keywords) {
      if (lowerQuestion.includes(keyword.toLowerCase())) {
        return topic;
      }
    }
  }

  // Default topic if no match found
  return "General";
}
