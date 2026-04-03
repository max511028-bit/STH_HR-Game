// === HR QUIZ - GOOGLE APPS SCRIPT ===
// Инструкция:
// 1. Создайте новую Google Таблицу
// 2. Лист "Questions" заголовки: A1=Theme, B1=QuestionText, C1=Option1, D1=Option2, E1=Option3, F1=Option4, G1=CorrectOptionIndex, H1=Feedback1, I1=Feedback2, J1=Feedback3, K1=Feedback4
// 3. Лист "Leaderboard" заголовки: A1=name, B1=totalPoints, C1=gamesCount, D1=bestScore
// 4. Расширения > Apps Script > вставьте этот код
// 5. Развернуть > Новое развертывание > Веб-приложение > Доступ: "Все пользователи"
// 6. Скопируйте URL и используйте в index.html

function doGet(e) {
  try {
    var action = e.parameter.action;
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action == 'getQuestions') {
      return getQuestions(sheet);
    } else if (action == 'getLeaderboard' || action == 'get') {
      return getLeaderboard(sheet);
    }
    
    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Error: ' + err.toString() });
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action == 'updateScore') {
      return updateScore(sheet, data);
    } else if (action == 'addQuestion') {
      return addQuestion(sheet, data);
    }
    
    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Error: ' + err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getQuestions(sheet) {
  var qSheet = sheet.getSheetByName('Questions');
  
  // Если листа нет — создаём с заголовками
  if (!qSheet) {
    qSheet = sheet.insertSheet('Questions');
    qSheet.appendRow(['Theme', 'QuestionText', 'Option1', 'Option2', 'Option3', 'Option4', 'CorrectOptionIndex', 'Feedback1', 'Feedback2', 'Feedback3', 'Feedback4']);
  }
  
  var rows = qSheet.getDataRange().getValues();
  var questions = [];
  var themesSet = {};
  
  // Начинаем с строки 1 (0 - заголовки)
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    // Пропускаем полностью пустые строки
    if (!row[1] || row[1].toString().trim() == '') continue;
    
    var theme = row[0] ? row[0].toString() : 'Общая';
    themesSet[theme] = true;
    
    // Формируем варианты ответов
    var options = [
      { text: row[2] ? row[2].toString() : '', feedback: row[7] ? row[7].toString() : '' },
      { text: row[3] ? row[3].toString() : '', feedback: row[8] ? row[8].toString() : '' },
      { text: row[4] ? row[4].toString() : '', feedback: row[9] ? row[9].toString() : '' },
      { text: row[5] ? row[5].toString() : '', feedback: row[10] ? row[10].toString() : '' }
    ];
    
    // Получаем индекс правильного ответа (0-3)
    var correctIndex = parseInt(row[6]) || 0;
    if (correctIndex < 0 || correctIndex > 3) correctIndex = 0;
    
    // Перемешиваем варианты ответов (классический способ)
    for (var k = options.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var temp = options[k];
      options[k] = options[r];
      options[r] = temp;
    }
    
    questions.push({
      theme: theme,
      text: row[1].toString(),
      options: options
    });
  }
  
  var themesArray = [];
  for (var t in themesSet) {
    if (themesSet.hasOwnProperty(t)) {
      themesArray.push(t);
    }
  }
  
  return jsonResponse({ 
    status: 'ok', 
    data: questions,
    themes: themesArray
  });
}

function getLeaderboard(sheet) {
  var lSheet = sheet.getSheetByName('Leaderboard');
  
  // Если листа нет — создаём с заголовками
  if (!lSheet) {
    lSheet = sheet.insertSheet('Leaderboard');
    lSheet.appendRow(['name', 'totalPoints', 'gamesCount', 'bestScore']);
  }
  
  var rows = lSheet.getDataRange().getValues();
  var leaderboard = [];
  
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0] || row[0].toString().trim() == '') continue;
    
    leaderboard.push({
      name: row[0].toString(),
      totalPoints: Number(row[1]) || 0,
      gamesCount: Number(row[2]) || 0,
      bestScore: Number(row[3]) || 0
    });
  }
  
  // Сортируем по убыванию очков
  leaderboard.sort(function(a, b) {
    return b.totalPoints - a.totalPoints;
  });
  
  return jsonResponse({ status: 'ok', data: leaderboard });
}

function updateScore(sheet, data) {
  var lSheet = sheet.getSheetByName('Leaderboard');
  
  // Если листа нет — создаём
  if (!lSheet) {
    lSheet = sheet.insertSheet('Leaderboard');
    lSheet.appendRow(['name', 'totalPoints', 'gamesCount', 'bestScore']);
  }
  
  var rows = lSheet.getDataRange().getValues();
  var found = false;
  var playerName = data.name ? data.name.toString() : 'Аноним';
  var score = Number(data.score) || 0;
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toString() == playerName) {
      // Обновляем существующего игрока
      var currentTotal = Number(rows[i][1]) || 0;
      var currentGames = Number(rows[i][2]) || 0;
      var currentBest = Number(rows[i][3]) || 0;
      
      var newTotal = currentTotal + score;
      var newGames = currentGames + 1;
      var newBest = Math.max(currentBest, score);
      
      lSheet.getRange(i + 1, 2).setValue(newTotal);
      lSheet.getRange(i + 1, 3).setValue(newGames);
      lSheet.getRange(i + 1, 4).setValue(newBest);
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Добавляем нового игрока
    lSheet.appendRow([playerName, score, 1, score]);
  }
  
  return jsonResponse({ status: 'ok', message: 'Score updated' });
}

function addQuestion(sheet, data) {
  var qSheet = sheet.getSheetByName('Questions');
  
  // Если листа нет — создаём
  if (!qSheet) {
    qSheet = sheet.insertSheet('Questions');
    qSheet.appendRow(['Theme', 'QuestionText', 'Option1', 'Option2', 'Option3', 'Option4', 'CorrectOptionIndex', 'Feedback1', 'Feedback2', 'Feedback3', 'Feedback4']);
  }
  
  var theme = data.theme ? data.theme.toString() : 'Общая';
  var question = data.question ? data.question.toString() : '';
  var options = data.options || ['', '', '', ''];
  var correctIndex = Number(data.correctIndex) || 0;
  var feedback = data.feedback || ['', '', '', ''];
  
  qSheet.appendRow([
    theme,
    question,
    options[0] || '',
    options[1] || '',
    options[2] || '',
    options[3] || '',
    correctIndex,
    feedback[0] || '',
    feedback[1] || '',
    feedback[2] || '',
    feedback[3] || ''
  ]);
  
  return jsonResponse({ status: 'ok', message: 'Question added' });
}
