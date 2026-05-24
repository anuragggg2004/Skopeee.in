document.addEventListener('DOMContentLoaded', () => {
  const phase1Section = document.getElementById('phase1');
  const phase2Section = document.getElementById('phase2');
  const btnPhase1 = document.getElementById('btn-phase1');
  const btnPhase2 = document.getElementById('btn-phase2');
  const btnBack = document.getElementById('btn-back');
  const phase1ErrorDiv = document.getElementById('phase1-error');
  const phase2ErrorDiv = document.getElementById('phase2-error');
  const phase2LoadingDiv = document.getElementById('phase2-loading');
  const phase2QuestionsDiv = document.getElementById('phase2-questions');

  // Helper to show/hide error messages
  function showError(errorDiv, message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
  }

  function hideError(errorDiv) {
    errorDiv.classList.add('hidden');
  }

  // Helper to toggle sections
  function showPhase2() {
    phase1Section.classList.add('hidden');
    phase2Section.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function showPhase1() {
    phase2Section.classList.add('hidden');
    phase1Section.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  // Phase 1: Get Adaptive Questions
  btnPhase1.addEventListener('click', async () => {
    const q1 = document.getElementById('q1').value.trim();
    const q2 = document.getElementById('q2').value.trim();
    const q3 = document.getElementById('q3').value.trim();

    if (!q1 || !q2 || !q3) {
      showError(phase1ErrorDiv, 'Please fill in all fields.');
      return;
    }

    hideError(phase1ErrorDiv);
    btnPhase1.disabled = true;
    btnPhase1.textContent = 'Loading...';

    try {
      const response = await fetch('/api/adaptive-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: { q1, q2, q3 } }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');

      // Store phase1 answers
      window.phase1Answers = { q1, q2, q3 };

      // Render phase 2 questions
      renderPhase2(data.questions);
      showPhase2();
    } catch (err) {
      showError(phase1ErrorDiv, `Error: ${err.message}`);
    } finally {
      btnPhase1.disabled = false;
      btnPhase1.textContent = 'Get Adaptive Questions';
    }
  });

  // Render Phase 2 Questions Dynamically
  function renderPhase2(questions) {
    phase2QuestionsDiv.innerHTML = '';

    questions.forEach((question, index) => {
      const div = document.createElement('div');
      div.className = 'question-group';

      const label = document.createElement('label');
      label.htmlFor = `phase2-q${index}`;
      label.textContent = question;

      const textarea = document.createElement('textarea');
      textarea.id = `phase2-q${index}`;
      textarea.placeholder = 'Your answer...';

      div.appendChild(label);
      div.appendChild(textarea);
      phase2QuestionsDiv.appendChild(div);
    });
  }

  // Phase 2: Generate Report
  btnPhase2.addEventListener('click', async () => {
    const textareas = phase2QuestionsDiv.querySelectorAll('textarea');
    const phase2Data = {};
    let allFilled = true;

    textareas.forEach((textarea, index) => {
      const value = textarea.value.trim();
      phase2Data[`q${index + 1}`] = value;
      if (!value) allFilled = false;
    });

    if (!allFilled) {
      showError(phase2ErrorDiv, 'Please fill in all Phase 2 fields.');
      return;
    }

    hideError(phase2ErrorDiv);
    btnPhase2.disabled = true;
    btnPhase2.textContent = 'Generating...';
    phase2LoadingDiv.classList.remove('hidden');

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase1: window.phase1Answers,
          phase2: phase2Data,
        }),
      });

      const report = await response.json();
      if (!response.ok) throw new Error(report.error || 'Request failed');

      // Save to sessionStorage
      sessionStorage.setItem('skope_report', JSON.stringify(report));
      sessionStorage.setItem('phase1_answers', JSON.stringify(window.phase1Answers));

      // Redirect to result.html
      window.location.href = 'result.html';
    } catch (err) {
      showError(phase2ErrorDiv, `Error: ${err.message}`);
    } finally {
      btnPhase2.disabled = false;
      btnPhase2.textContent = 'Generate Your Report';
      phase2LoadingDiv.classList.add('hidden');
    }
  });

  // Back button
  btnBack.addEventListener('click', showPhase1);

  // Result Page: Load and Display PathReport
  const keyInsightEl = document.getElementById('key-insight');
  if (keyInsightEl) {
    const report = JSON.parse(sessionStorage.getItem('skope_report') || '{}');

    // Render Key Insight
    if (report.key_insight) {
      keyInsightEl.textContent = report.key_insight;
    }

    // Render Profile Summary
    const summaryEl = document.getElementById('profile-summary');
    if (report.profile_summary) {
      summaryEl.textContent = report.profile_summary;
    }

    // Render Strengths
    const strengthsList = document.getElementById('strengths-list');
    if (report.strengths) {
      strengthsList.innerHTML = report.strengths.map(s => `<li>• ${s}</li>`).join('');
    }

    // Render Gaps
    const gapsList = document.getElementById('gaps-list');
    if (report.gaps) {
      gapsList.innerHTML = report.gaps.map(g => `<li>• ${g}</li>`).join('');
    }

    // Render Careers
    const careersGrid = document.getElementById('careers-grid');
    if (report.careers) {
      careersGrid.innerHTML = report.careers.map(career => `
        <div class="card">
          <h3>${career.title}</h3>
          <p><strong>Why it fits:</strong> ${career.why_it_fits}</p>
          <p class="card-meta"><strong>Exams:</strong> ${(career.entrance_exams || []).join(', ') || 'N/A'}</p>
          <p class="card-meta"><strong>Range:</strong> ${career.earning_range}</p>
          <p class="card-meta"><strong>Reality Check:</strong> ${career.reality_check}</p>
        </div>
      `).join('');
    }

    // Render Colleges Table
    const collegesTbody = document.getElementById('colleges-tbody');
    if (report.colleges) {
      collegesTbody.innerHTML = report.colleges.map(college => `
        <tr>
          <td><strong>${college.name}</strong></td>
          <td>${college.city}</td>
          <td>${college.type}</td>
          <td>${college.entrance_exam}</td>
          <td>${college.why_this_fits}</td>
          <td><span class="difficulty-badge ${college.difficulty.toLowerCase()}">${college.difficulty}</span></td>
        </tr>
      `).join('');
    }

    // Render Emerging Roles
    const emergingRolesGrid = document.getElementById('emerging-roles-grid');
    if (report.emerging_roles) {
      emergingRolesGrid.innerHTML = report.emerging_roles.map(role => `
        <div class="card">
          <h3>${role.title}</h3>
          <p>${role.description}</p>
          <p class="card-meta"><strong>Why relevant:</strong> ${role.why_relevant}</p>
        </div>
      `).join('');
    }

    // Render Action List
    const actionList = document.getElementById('action-list');
    if (report.next_30_days) {
      actionList.innerHTML = report.next_30_days.map((action, i) => `<li>Day ${(i + 1) * 6}: ${action}</li>`).join('');
    }

    // Chat Setup
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatBtn = document.getElementById('chat-btn');
    const chatChips = document.getElementById('chat-chips');

    if (chatMessages) {
      let messageHistory = [];

      // Chip suggestions
      const chipSuggestions = [
        'Tell me more about engineering vs product design',
        'Which entrance exam should I focus on?',
        'How can I prepare for JEE?',
        'What skills do I need for product management?'
      ];

      chatChips.innerHTML = chipSuggestions.map(chip => `
        <div class="chip" onclick="sendChatMessage('${chip}')">${chip}</div>
      `).join('');

      // Global function to send chat message
      window.sendChatMessage = async (message) => {
        if (!message.trim()) return;

        // Add user message
        const userBubble = document.createElement('div');
        userBubble.className = 'message user';
        userBubble.innerHTML = `<div class="message-bubble">${message}</div>`;
        chatMessages.appendChild(userBubble);

        // Update input
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add to history
        messageHistory.push({ role: 'user', content: message });

        // Send to API
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              pathreport: report,
              history: messageHistory,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Chat failed');

          const reply = data.reply;
          messageHistory.push({ role: 'assistant', content: reply });

          // Add assistant message
          const assistantBubble = document.createElement('div');
          assistantBubble.className = 'message assistant';
          assistantBubble.innerHTML = `<div class="message-bubble">${reply}</div>`;
          chatMessages.appendChild(assistantBubble);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (err) {
          const errorBubble = document.createElement('div');
          errorBubble.className = 'message assistant';
          errorBubble.innerHTML = `<div class="message-bubble" style="color: #ff6b6b;">Error: ${err.message}</div>`;
          chatMessages.appendChild(errorBubble);
        }
      };

      // Send button
      chatBtn.addEventListener('click', () => {
        window.sendChatMessage(chatInput.value);
      });

      // Enter key
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.sendChatMessage(chatInput.value);
        }
      });
    }
  }
});
