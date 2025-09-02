document.addEventListener('DOMContentLoaded', () => {
    const quizData = {
      "cards": [
        {
          "question": "Какой язык используется для создания веб-страниц?",
          "choices": ["Python", "HTML", "C++", "Java"],
          "correct_index": 1,
          "hint": "Это язык разметки, а не программирования"
        },
        {
          "question": "Что делает оператор '==' в Python?",
          "choices": ["Присваивает значение", "Сравнивает значения", "Умножает", "Ничего"],
          "correct_index": 1,
          "hint": "Этот оператор проверяет равенство"
        },
        {
          "question": "Какой метод используется для добавления элемента в список в Python?",
          "choices": [".add()", ".append()", ".insert()", ".push()"],
          "correct_index": 1,
          "hint": "Этот метод буквально означает \"добавить в конец\""
        },
        {
          "question": "Что возвращает функция len() в Python?",
          "choices": ["Сумму элементов", "Максимум", "Длину", "Ничего"],
          "correct_index": 2,
          "hint": "Она измеряет размер"
        },
        {
            "question": "Какой метод используется для добавления элемента в список в Python?",
            "choices": [".add()", ".append()", ".insert()", ".push()"],
            "correct_index": 1,
            "hint": "Этот метод буквально означает \"добавить в конец\""
        },
        {
            "question": "Какой метод используется для добавления элемента в список в Python?",
            "choices": [".add()", ".append()", ".insert()", ".push()"],
            "correct_index": 1,
            "hint": "Этот метод буквально означает \"добавить в конец\""
        }
      ],
      "nextQuizTitle": "Следующий квиз: Алгоритмы"
    };

    // DOM Элементы
    const quizCard = document.getElementById('quiz-card');
    const resultsCard = document.getElementById('results-card');
    const questionTextEl = document.getElementById('question-text');
    const choicesGridEl = document.getElementById('choices-grid');
    const progressTextEl = document.getElementById('progress-text');
    const progressBarEl = document.getElementById('progress-bar');
    const hintButton = document.getElementById('hint-button');
    const hintTextEl = document.getElementById('hint-text');
    const nextButton = document.getElementById('next-button');
    const restartButton = document.getElementById('restart-button');
    const resultsTextEl = document.getElementById('results-text');
    const resultsTitleEl = document.getElementById('results-title');
    const feedbackEl = document.getElementById('feedback-section');


    // Состояние квиза
    let currentQuestionIndex = 0;
    let score = 0;
    const totalQuestions = quizData.cards.length;

    function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        resultsCard.style.display = 'none';
        quizCard.style.display = 'flex';
        loadQuestion();
    }

    function loadQuestion() {
        // Сброс состояний перед загрузкой нового вопроса
        resetState();

        const currentCard = quizData.cards[currentQuestionIndex];

        // Обновление контента
        questionTextEl.textContent = currentCard.question;
        hintTextEl.textContent = currentCard.hint;

        currentCard.choices.forEach((choice, index) => {
            const li = document.createElement('li');
            li.className = 'choice-item';
            li.dataset.index = index;
            li.innerHTML = `
                <span>${choice}</span>
                <svg class="choice-icon" id="icon-check-svg"><use href="#icon-check"></use></svg>
                <svg class="choice-icon" id="icon-close-svg"><use href="#icon-close"></use></svg>
            `;
            li.addEventListener('click', handleChoiceClick);
            choicesGridEl.appendChild(li);
        });

        updateProgress();
    }

    function resetState() {
        choicesGridEl.innerHTML = '';
        nextButton.style.display = 'none';
        hintTextEl.classList.remove('visible');
        hintButton.style.display = 'block';
        feedbackEl.textContent = '';
        feedbackEl.className = 'feedback-section';
    }

    function updateProgress() {
        progressTextEl.textContent = `Вопрос ${currentQuestionIndex + 1}/${totalQuestions}`;
        const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;
        progressBarEl.style.width = `${progressPercentage}%`;
    }

    function handleChoiceClick(event) {
        const selectedChoice = event.currentTarget;
        const selectedIndex = parseInt(selectedChoice.dataset.index);
        const correctIndex = quizData.cards[currentQuestionIndex].correct_index;

        disableChoices();

        if (selectedIndex === correctIndex) {
            score++;
            selectedChoice.classList.add('correct');
            feedbackEl.textContent = 'Правильно!';
            feedbackEl.classList.add('correct');
        } else {
            selectedChoice.classList.add('incorrect');
            const correctChoiceEl = choicesGridEl.querySelector(`[data-index='${correctIndex}']`);
            correctChoiceEl.classList.add('correct');
            feedbackEl.textContent = 'Неправильно!';
            feedbackEl.classList.add('incorrect');
        }

        // Показать кнопку "Далее" с небольшой задержкой для восприятия
        setTimeout(() => {
            nextButton.style.display = 'block';
        }, 800);
    }

    function disableChoices() {
        Array.from(choicesGridEl.children).forEach(child => {
            child.classList.add('disabled');
            child.removeEventListener('click', handleChoiceClick);
        });
        hintButton.style.display = 'none';
    }

    function handleNextClick() {
        currentQuestionIndex++;
        if (currentQuestionIndex < totalQuestions) {
            loadQuestion();
        } else {
            showResults();
        }
    }

    function showResults() {
        quizCard.style.display = 'none';
        resultsCard.style.display = 'flex';
        resultsTextEl.textContent = `Ваш результат: ${score} из ${totalQuestions}`;
        resultsTitleEl.textContent = quizData.nextQuizTitle;
    }

    // Обработчики событий
    hintButton.addEventListener('click', () => {
        hintTextEl.classList.toggle('visible');
    });

    nextButton.addEventListener('click', handleNextClick);
    restartButton.addEventListener('click', startQuiz);

    // Запуск квиза
    startQuiz();
});