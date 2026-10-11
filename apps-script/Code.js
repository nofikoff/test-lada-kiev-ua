/**
 * Script bound to the price sheet. Paste into Extensions → Apps Script of the sheet and run setup()
 * as the owner (docs/runbook-deploy.md). Cell addresses and status texts are the contract of
 * specs/005-sheet-price-publishing/contracts/sheet-layout.md and data-model.md §Status transitions.
 *
 * Both triggers are installable and run as the owner who created them, which is why the token sits
 * in the owner's UserProperties: an editor opening this editor sees their own, empty properties.
 */

var REPO = 'nofikoff/test-lada-kiev-ua';
var WORKFLOW = 'publish.yml';
var SHEET_NAME = 'Цены';
var PUBLISH_CELL = 'B1';
var STATUS_CELL = 'C1';
var TOKEN_PROPERTY = 'GITHUB_DISPATCH_TOKEN';
var EXPIRY_WARNED_PROPERTY = 'TOKEN_EXPIRY_WARNED_ON';
var STALE_MINUTES = 25;
var EXPIRY_WARNING_DAYS = 14;
// Apps Script's time zone database may predate the Europe/Kyiv spelling; the old alias names the same zone.
var TIME_ZONE = 'Europe/Kiev';

function setup() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.prompt('Токен GitHub', 'Fine-grained PAT: один репозиторий, Actions — Read and write', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK || !answer.getResponseText().trim()) return;
  PropertiesService.getUserProperties().setProperty(TOKEN_PROPERTY, answer.getResponseText().trim());
  PropertiesService.getUserProperties().deleteProperty(EXPIRY_WARNED_PROPERTY);

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('onPublishEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  ScriptApp.newTrigger('watchdog').timeBased().everyMinutes(10).create();
  ui.alert('Готово: токен сохранён, триггеры созданы.');
}

function onPublishEdit(e) {
  var range = e.range;
  if (range.getSheet().getName() !== SHEET_NAME || range.getA1Notation() !== PUBLISH_CELL) return;
  if (range.getValue() !== true) return;

  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) return;
  try {
    var sheet = range.getSheet();
    sheet.getRange(PUBLISH_CELL).setValue(false);
    var token = PropertiesService.getUserProperties().getProperty(TOKEN_PROPERTY);
    if (!token) {
      setStatus(sheet, 'нет доступа к публикации, Руслан уведомлён');
      notify('Галочка «Опубликовать» нажата, но токен GitHub не сохранён. Запусти setup() в редакторе скрипта таблицы.');
      return;
    }

    var response = UrlFetchApp.fetch(
      'https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches',
      {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        payload: JSON.stringify({ ref: 'main', inputs: { source: 'sheet' } }),
      },
    );
    var code = response.getResponseCode();
    if (code === 204) {
      setStatus(sheet, 'публикация запущена в ' + clock(new Date()));
      warnIfTokenExpiresSoon(response.getAllHeaders());
    } else if (code === 401 || code === 403 || code === 404) {
      setStatus(sheet, 'нет доступа к публикации, Руслан уведомлён');
      notify('GitHub ответил ' + code + ' на запуск публикации: токен истёк, отозван или потерял права. Создай новый и запусти setup().');
    } else {
      setStatus(sheet, 'ошибка запуска, Руслан уведомлён');
      notify('GitHub ответил ' + code + ' на запуск публикации: ' + response.getContentText().slice(0, 500));
    }
  } finally {
    lock.releaseLock();
  }
}

/** A run that dies before writing its outcome leaves «запущена»/«идёт» behind; this replaces it (FR-028). */
function watchdog() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  var status = String(sheet.getRange(STATUS_CELL).getValue());
  var match = status.match(/^публикация (?:запущена в|идёт с) (\d{2}):(\d{2})$/);
  if (!match) return;
  var started = Number(match[1]) * 60 + Number(match[2]);
  var now = minutesOfDay(new Date());
  // The status carries no date; a start "later" than now means it began before midnight.
  var elapsed = (now - started + 24 * 60) % (24 * 60);
  if (elapsed <= STALE_MINUTES) return;
  setStatus(sheet, 'ошибка, Руслан уведомлён');
  notify('Публикация со статусом «' + status + '» не завершилась за ' + STALE_MINUTES + ' минут. Смотри Actions → publish.');
}

function warnIfTokenExpiresSoon(headers) {
  var expiration = null;
  Object.keys(headers).forEach(function (name) {
    if (name.toLowerCase() === 'github-authentication-token-expiration') expiration = headers[name];
  });
  if (!expiration) return;
  var expiresAt = new Date(String(expiration).replace(' UTC', 'Z').replace(' ', 'T'));
  var daysLeft = Math.floor((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (isNaN(daysLeft) || daysLeft >= EXPIRY_WARNING_DAYS) return;

  var properties = PropertiesService.getUserProperties();
  var today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
  if (properties.getProperty(EXPIRY_WARNED_PROPERTY) === today) return;
  properties.setProperty(EXPIRY_WARNED_PROPERTY, today);
  notify('Токен GitHub для публикации цен истекает через ' + daysLeft + ' дн. (' + expiration + '). Создай новый и запусти setup().');
}

function setStatus(sheet, text) {
  sheet.getRange(STATUS_CELL).setValue(text);
}

function notify(text) {
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'lada.kiev.ua: публикация цен', text);
}

function clock(date) {
  return Utilities.formatDate(date, TIME_ZONE, 'HH:mm');
}

function minutesOfDay(date) {
  var parts = clock(date).split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}
