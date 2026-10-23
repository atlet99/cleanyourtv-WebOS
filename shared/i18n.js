/* Shared UI vocabulary. Protocol fields, app names and user content stay unchanged. ES5 for the TV pages. */
(function (root) {
  var RU = {
    'Inputs':'Источники', 'Settings':'Настройки', 'Customise':'Настроить экран', 'Open':'Открыть',
    'Move left in dock':'Сдвинуть влево в избранном', 'Move right in dock':'Сдвинуть вправо в избранном',
    'Remove from dock':'Убрать из избранного', 'Add to dock':'Закрепить в избранном', 'Add to dock...':'Закрепить приложение…',
    'Replace which app?':'Какое приложение заменить?', 'Hide app':'Скрыть приложение', 'Remove this button':'Убрать кнопку',
    'hold OK on an app':'удерживайте OK на приложении', 'Hold OK on any app to change the dock':'Чтобы настроить избранное, выделите приложение и удерживайте OK',
    'Top buttons':'Кнопки верхней панели', 'Hidden apps':'Скрытые приложения', 'App order':'Порядок приложений',
    'Most used first':'По частоте запуска', 'A to Z':'По алфавиту', 'Reset customisation':'Сбросить оформление экрана',
    'Add a button...':'Добавить кнопку…', 'Add a button':'Добавить кнопку', 'An app...':'Приложение…', 'Pick an app':'Выберите приложение',
    'OK to remove':'Нажмите OK, чтобы убрать', 'Hidden apps (OK to show again)':'Скрытые приложения — OK, чтобы вернуть', 'No hidden apps':'Скрытых приложений нет',
    'Restore LG Home':'Вернуть главный экран LG', 'Switching to LG Home: the TV restarts...':'Возвращаем главный экран LG. Телевизор перезагрузится…',
    'Could not open':'Не удалось открыть', 'Could not open {0}':'Не удалось открыть {0}', 'Could not save settings':'Не удалось сохранить настройки',
    'Helper not reachable, retrying...':'Служба CleanYourTV недоступна. Подключаемся повторно…',
    'Connected':'Подключено', 'Active':'Текущий источник', 'Clock':'Формат времени', 'Automatic':'Как в настройках ТВ', '24-hour':'24 часа', '12-hour':'12 часов',
    'Live TV':'Телеканалы', 'All channels':'Все каналы', 'Loading channels...':'Загружаем каналы…', 'Set up Live TV':'Настройка телеканалов',
    'Open this address on your phone or computer:':'Откройте этот адрес на телефоне или компьютере:', 'and enter this code:':'и введите код с экрана:',
    'Then paste your M3U playlist address. This page closes by itself.':'Укажите адрес плейлиста M3U. После настройки страница закроется автоматически.',
    'This channel is not available.':'Канал сейчас недоступен.', 'Press OK to try again.':'Нажмите OK, чтобы подключиться повторно.', 'The helper is not reachable.':'Нет связи со службой CleanYourTV.',
    'Next':'Далее в эфире', 'Later':'Позже', 'No guide data':'Нет программы передач', 'Favourites':'Избранное', 'Recent':'Недавние', 'Search...':'Поиск…',
    'Filters':'Фильтры', 'Country':'Страна', 'Language':'Язык', 'Quality':'Качество', 'All':'Все', 'Clear filters':'Сбросить фильтры',
    'Added to favourites':'Канал добавлен в избранное', 'Removed from favourites':'Канал убран из избранного', 'Favourite':'В избранном',
    'On':'Включено', 'Off':'Выключено', 'Stream':'Поток', 'streams':'потоков', 'Statistics':'Статистика воспроизведения', 'Close':'Закрыть',
    'Tuning...':'Подключаемся к каналу…', 'Checking why...':'Проверяем причину ошибки…', 'buffer':'буфер', 'frames':'кадров', 'dropped':'пропущено', 'reloaded':'перезапусков',
    'No favourites yet. Press the green button on a channel.':'В избранном пока пусто. Выделите канал и нажмите зелёную кнопку пульта.',
    'Nothing watched yet.':'Вы ещё не открывали каналы.', 'No channels match.':'По заданным условиям каналы не найдены.',
    'The server refused the stream: it may be blocked in your country or need special request headers.':'Сервер отклонил запрос. Возможны региональное ограничение или необходимость специальных HTTP-заголовков.',
    'The stream was not found (404): the channel is offline or its address has changed.':'Поток не найден (HTTP 404). Канал отключён или его адрес изменился.',
    'The stream server reported an error.':'Ошибка на сервере трансляции.', 'The address answers with a web page, not a video.':'По этому адресу открывается веб-страница вместо видеопотока.',
    'This stream is protected by DRM and cannot be played here.':'Поток защищён DRM. Этот проигрыватель не поддерживает его воспроизведение.',
    'The stream server cannot be reached.':'Не удалось подключиться к серверу трансляции.', 'The stream is too slow to start.':'Сервер слишком долго не начинает передачу видео.',
    'The stream answers, but the TV could not play it: probably a format it cannot decode.':'Поток доступен, но телевизор не может его воспроизвести. Вероятно, формат видео или звука не поддерживается.',
    'Apps':'Приложения', 'Your playlist':'Ваш плейлист', 'Nothing connected':'Нет подключения',
    'Can’t read the inputs. Live TV still works.':'Не удалось получить список входов. Телеканалы остаются доступны.',
    'Back':'Назад', 'Cancel':'Отмена', 'Start':'Начать', 'Skip':'Пропустить', 'Clear':'Сбросить', 'Continue':'Продолжить', 'Try again':'Повторить',
    'selected':'выбрано', 'Theme default':'Цвет темы',
    'Accent colour':'Акцентный цвет', 'Go back to the previous theme':'Вернуть предыдущую тему', 'nothing to go back to':'Предыдущая тема не сохранена',
    'Previous theme restored':'Предыдущая тема восстановлена', 'Accent: theme default':'Акцентный цвет сброшен к цвету темы', 'Accent: {0}':'Акцентный цвет: {0}',
    'Stable releases':'Стабильные версии', 'the latest published release':'Последняя стабильная версия', 'Test: {0}':'Тестовая сборка: {0}', 'build {0}':'сборка {0}',
    'No test builds right now':'Тестовых сборок пока нет', 'a test build appears when a branch is pushed':'Сборки появляются после публикации изменений в ветке',
    'Default agent':'Агент по умолчанию', 'Home Assistant’s own':'Встроенный агент Home Assistant', 'default':'по умолчанию',
    'Home Assistant first, then the AI':'Сначала Home Assistant, затем ИИ', 'Home Assistant only':'Только Home Assistant', 'The AI only':'Только ИИ',
    'Install voice':'Установить голосовое управление', 'installing…':'идёт установка…', 'downloads about 80 MB':'Загрузка около 80 МБ',
    'Listen on the voice button':'Запускать распознавание кнопкой пульта', 'learn a button first':'Сначала назначьте кнопку', 'Learn the voice button':'Назначить кнопку микрофона',
    'now: {0}':'Код кнопки: {0}', 'not learned':'Кнопка не назначена', 'Try it now':'Проверить микрофон', 'listening…':'слушаем…',
    'speak when the card appears':'Говорите после появления карточки', 'Speak now…':'Говорите…', 'Switch off LG’s voice assistant':'Приостанавливать голосовой помощник LG',
    'not paused yet':'ещё не приостановлен', 'not set · set up from your phone':'Не настроено — откройте настройку с телефона', 'Which answers first':'Кому направлять запрос',
    'Assist agent':'Агент Assist', 'set up Home Assistant first':'Сначала настройте Home Assistant', 'AI chat (OpenRouter)':'Ответы ИИ через OpenRouter',
    'no key set':'Ключ API не задан', 'Model':'Модель', 'Send the text to':'Отправка текста на свой сервер', 'not set · shows a card only':'Сервер не задан — текст только на экране',
    'Set up from your phone':'Настроить с телефона', 'key, model, Home Assistant, server':'Ключ API, модель, Home Assistant и свой сервер',
    'Set up with commands':'Настроить через SSH', 'for scripts and ssh':'Команды и примеры запросов', 'Forget the conversation':'Очистить контекст диалога',
    'Conversation cleared':'Контекст диалога очищен', 'Remove voice':'Удалить голосовой модуль', 'deletes the {0} MB download':'Удалит загруженные файлы: {0} МБ',
    'Voice removed':'Голосовой модуль удалён', 'Accept notifications from the network':'Принимать уведомления из локальной сети', 'How to send':'Как отправить уведомление',
    'address, token, example':'Адрес, токен доступа и пример запроса', 'New token':'Заменить токен доступа', 'the old one stops working':'Прежний токен перестанет действовать',
    'New token created. Open “How to send” to see it.':'Токен заменён. Новый токен показан в разделе «Как отправить уведомление».',
    'Update to {0}':'Обновить до {0}', 'recommended first · installed {0}':'Рекомендуется обновить перед настройкой · установлено {0}',
    'Debloat LG’s ads and telemetry':'Блокировать рекламу и телеметрию LG', 'Take over the Input key':'Открывать наши источники кнопкой Input',
    'Set up now':'Установить и настроить', 'the screen blinks once':'Во время настройки экран один раз мигнёт', 'Set up anyway':'Установить на этой прошивке',
    'untested firmware; a failed start restarts the TV':'Прошивка не проверена; при сбое запуска ТВ вернётся к экрану LG',
    'Check for updates':'Проверить обновления', 'works without the service':'Доступно и до настройки службы', 'Share log':'Поделиться диагностикой', 'Share the log':'Поделиться диагностикой',
    'QR code for your phone':'Откройте отчёт на телефоне по QR-коду', 'Yes, remove CleanYourTV':'Удалить CleanYourTV', 'Yes, use CleanYourTV as Home':'Сделать CleanYourTV главным экраном',
    'Yes, use LG’s Home':'Вернуть главный экран LG', 'settings and apps are deleted; the TV restarts':'Будут удалены приложения CleanYourTV и их настройки. ТВ перезагрузится',
    'the TV restarts':'Телевизор перезагрузится', 'Removing CleanYourTV… the TV restarts in a moment and LG’s Home comes back.':'Удаляем CleanYourTV. После перезагрузки откроется главный экран LG.',
    'Switching to CleanYourTV… the TV restarts in a moment.':'Выбран главный экран CleanYourTV. Телевизор скоро перезагрузится.',
    'Switching to LG’s Home… the TV restarts in a moment.':'Выбран главный экран LG. Телевизор скоро перезагрузится.',
    'Show Live TV':'Показывать раздел «Телеканалы»', 'Playlist':'Плейлист', '{0} channels':'Каналов: {0}', 'guide for {0} programmes':'Передач в программе: {0}',
    'Refresh playlist and guide':'Обновить плейлист и программу передач', 'Refreshing…':'Обновляем…', 'Refreshing in the background':'Обновление выполняется в фоне',
    'Learn the Guide key':'Назначить кнопку Guide', 'not learned · LG’s guide stays':'Не назначена — открывается программа передач LG', 'Live TV is off':'Раздел «Телеканалы» выключен',
    'Clear recent channels':'Очистить историю каналов', 'Recent channels cleared':'История каналов очищена', 'Remove the playlist':'Удалить плейлист', 'nothing to remove':'Плейлист не задан',
    'Yes, remove the playlist':'Удалить плейлист и его данные', 'the address, the channel list, the guide and your favourites are deleted':'Будут удалены адрес плейлиста, каналы, программа передач и избранное',
    'Playlist removed':'Плейлист удалён', 'No, keep it':'Оставить плейлист', 'Input key opens our Inputs list':'Открывать наши источники кнопкой Input',
    'not available on this firmware':'Не поддерживается этой прошивкой', 'Learn the Input key':'Назначить кнопку Input', 'default ({0})':'Стандартный код ({0})',
    'learned: {0}':'Сохранённый код: {0}', 'Learn the Home key':'Определить код кнопки Home', 'optional · {0}':'Необязательно · {0}',
    'Checking…':'Проверяем…', 'No release yet':'Версии ещё не опубликованы', 'Cannot check':'Не удалось проверить обновления', 'Up to date':'Установлена актуальная версия',
    'Launcher {0}':'Главный экран {0}', 'Service {0}':'Служба {0}', 'service {0}':'служба {0}', 'Update channel':'Канал обновлений', 'Go back to launcher {0}':'Вернуть главный экран версии {0}',
    'CleanYourTV as Home':'Главный экран CleanYourTV', 'Theme':'Тема оформления', 'Input key':'Кнопка Input', 'not available':'Недоступно', 'Voice':'Голосовое управление',
    'not installed':'Не установлен', 'Network notifications':'Сетевые уведомления', 'Uninstall':'Удалить CleanYourTV',
    'Choose the model that answers':'Выберите модель для ответов', 'Choose the Home Assistant agent':'Выберите агента Home Assistant', 'Where updates come from':'Источник обновлений',
    'Live TV: your own playlist':'Телеканалы из вашего плейлиста', 'Remove the playlist?':'Удалить плейлист?',
    'Choose how Home looks. The change shows the next time you open Home.':'Выберите оформление. Изменения появятся при следующем открытии главного экрана.',
    'The colour of the focus ring and highlights':'Цвет рамки фокуса и выделенных элементов', 'Last heard: “{0}”':'Распознанная речь: «{0}»', 'Not sent: {0}':'Не удалось отправить: {0}',
    'Last try: {0}':'Последняя попытка: {0}', 'Remove CleanYourTV?':'Удалить CleanYourTV?', 'Switch Home?':'Сменить главный экран?',
    'Updates: {0}':'Обновления: {0}', 'Latest release {0}':'Последняя версия: {0}',
    'The service is not running. Set it up to replace LG’s Home, take over the Input key and keep everything up to date.':'Служба ещё не запущена. Выполните настройку, чтобы заменить главный экран LG, назначить кнопку Input и включить обновления.',
    'Preparing…':'Готовим страницу…', 'Playlist saved':'Плейлист сохранён', 'The service did not answer':'Служба CleanYourTV не отвечает', 'The service did not answer.':'Служба CleanYourTV не отвечает.',
    'The page stays open for ten minutes. It is not encrypted: the playlist address, which may hold an access key, travels over your Wi-Fi.':'Страница доступна 10 минут. Соединение не зашифровано: адрес плейлиста может содержать ключ доступа. Используйте доверенную сеть Wi-Fi.',
    'Loading themes…':'Загружаем темы…', 'Theme applied. Open Home to see it.':'Тема выбрана. Откройте главный экран, чтобы увидеть изменения.',
    'Looking for test builds…':'Ищем тестовые сборки…', 'Switching…':'Меняем канал обновлений…', 'Back on the stable releases':'Выбран канал стабильных версий',
    'Following {0}. If the Launcher or Service row offers an update, that is the test build.':'Выбрана тестовая ветка {0}. Доступную сборку можно установить в строках главного экрана и службы.',
    'Loading the model list…':'Загружаем список моделей…', 'Auto (OpenRouter picks)':'Автоматически — выбор OpenRouter', 'Asking Home Assistant…':'Подключаемся к Home Assistant…',
    'Connected to {0}':'Подключено к {0}', 'Agent: {0}':'Агент: {0}', 'Model: {0}':'Модель: {0}',
    'The page stays open for ten minutes, or until you save. It is not encrypted: the key travels over your Wi-Fi, so use a network you trust.':'Страница доступна 10 минут или до сохранения. Ключи передаются без шифрования — подключайтесь только через доверенную сеть Wi-Fi.',
    'Saved':'Сохранено', 'The page has closed. Close this and try again.':'Время доступа истекло. Закройте это окно и откройте настройку повторно.',
    'Listening…':'Слушаем…', 'Waiting for the service…':'Ожидаем запуска службы…', 'Checking for updates…':'Проверяем обновления…', 'Could not check: {0}':'Не удалось проверить обновления: {0}',
    'Version {0} is available; this one is {1}.':'Доступна версия {0}. Сейчас установлена {1}.', 'Up to date ({0}).':'Установлена актуальная версия ({0}).',
    'Updating to {0}…':'Устанавливаем версию {0}…', 'Update failed: {0}':'Не удалось обновить: {0}', 'Updating… {0}':'Обновление: {0}',
    'The update is taking too long. Log: /media/developer/cleanyourtv/run/selfupdate.log on the TV.':'Обновление занимает слишком много времени. Журнал на ТВ: /media/developer/cleanyourtv/run/selfupdate.log.',
    'The Input key.\nChoose Start, then press the Input button on your remote.':'Назначение кнопки Input.\nВыберите «Начать», затем нажмите Input на пульте.',
    'The Home key (optional).\nChoose Start, then press the Home button on your remote.':'Код кнопки Home (необязательно).\nВыберите «Начать», затем нажмите Home на пульте.',
    'The voice button.\nChoose Start, then press the button you want to use for voice. The remote’s microphone button may not reach the hook; any spare button works.':'Назначение кнопки микрофона.\nВыберите «Начать» и нажмите нужную кнопку. Если кнопка микрофона не определяется, используйте другую свободную кнопку пульта.',
    'The Guide key.\nChoose Start, then press the Guide button on your remote. It then opens the Live TV channel guide instead of LG’s guide. Clear it to get LG’s guide back.':'Назначение кнопки Guide.\nВыберите «Начать», затем нажмите Guide на пульте. Она будет открывать программу передач ваших телеканалов. Сброс назначения вернёт программу передач LG.',
    'default: {0}':'Стандартный код: {0}', 'back to the default (241)':'Вернуть стандартный код 241', 'forget the code':'Удалить сохранённый код', 'LG’s guide again':'Вернуть программу передач LG',
    'Input key cleared.\nIt uses the default code ({0}).':'Назначение Input сброшено.\nИспользуется стандартный код {0}.', 'Voice button cleared.':'Назначение кнопки микрофона сброшено.',
    'Guide key cleared. LG’s guide is back.':'Назначение Guide сброшено. Снова открывается программа передач LG.', 'Home key cleared.':'Код кнопки Home удалён.',
    'Press the {0} button now…':'Нажмите кнопку {0} на пульте…', '{0} key learned: code {1}.':'Кнопка {0} определена. Код: {1}.', 'Continue to the test':'Проверить назначение',
    'The hook did not attach on this firmware, so keys cannot be learned. The Input key stays with LG’s picker.\nUse Share log to report this.':'На этой прошивке перехват кнопок не работает. Input продолжит открывать список источников LG.\nОтправьте отчёт через «Поделиться диагностикой».',
    'Nothing was pressed.':'За отведённое время нажатие не обнаружено.', 'Test.\nPress the Input button once more. Our Inputs list should open over this screen.':'Проверка назначения.\nНажмите Input ещё раз. Поверх этого экрана должен открыться список источников CleanYourTV.',
    'The Inputs list opened: the Input key works.':'Список источников открылся — кнопка Input работает.',
    'The Inputs list did not open.\nIf LG’s own picker showed, the Input key is not mapped: learn it again or switch the Input key off.':'Список источников не открылся.\nЕсли появился список LG, назначьте Input заново или отключите перехват этой кнопки.', 'Learn again':'Назначить заново',
    'Done.\nInput key {0}.\nThe Home key is optional: learn it from the main list if you want it recorded.':'Готово.\nКод кнопки Input: {0}.\nПри желании код Home можно определить отдельно в настройках кнопок.',
    'Preparing the report…':'Собираем диагностический отчёт…', 'The page is open for ten minutes. It lists versions, the setup log and the service log; addresses and URL paths are masked.':'Отчёт доступен 10 минут. В нём указаны версии и журналы установки и службы. IP-адреса и пути в URL скрыты.',
    'Could not prepare the report (is the Homebrew Channel installed?).':'Не удалось собрать отчёт. Проверьте, установлен ли Homebrew Channel.',
    'Setting up… the screen blinks once while LG’s system restarts':'Выполняем настройку. При перезапуске системной службы LG экран один раз мигнёт.',
    'Could not start the setup: {0}':'Не удалось начать настройку: {0}', 'Setup stopped: {0}':'Настройка остановлена: {0}', 'Setting up… {0}':'Настройка: {0}', 'Reading status…':'Проверяем состояние…',
    'no answer':'Нет ответа', 'no answer from the Homebrew Channel service (is it installed and up to date?)':'Нет ответа от Homebrew Channel. Проверьте его установку и версию.',
    'You said':'Вы сказали', 'Thinking':'Готовим ответ', 'Answer':'Ответ', 'Not answered':'Не удалось получить ответ', 'Listening':'Слушаем', 'Recognising':'Распознаём речь',
    'I did not hear anything':'Речь не обнаружена. Попробуйте говорить ближе к микрофону.', 'I could not make out any words':'Не удалось разобрать речь. Попробуйте ещё раз. Модель распознаёт только английский язык.',
    'nothing heard':'Речь не обнаружена', 'nothing recognised':'Речь не распознана', 'error':'Ошибка', 'Moonshine tiny (English)':'Moonshine tiny — распознавание только английской речи',
    'Downloading launcher {0}':'Загружаем главный экран версии {0}', 'Checking the download':'Проверяем загруженные файлы', 'Installing launcher {0}':'Устанавливаем главный экран версии {0}',
    'Checking that the new launcher starts':'Проверяем запуск нового главного экрана', 'The new launcher did not start; rolling back':'Новый главный экран не запустился. Возвращаем предыдущую версию',
    'Launcher {0} installed':'Главный экран версии {0} установлен', 'Launcher {0} restored':'Главный экран версии {0} восстановлен', 'Going back to launcher {0}':'Возвращаем главный экран версии {0}',
    'Downloading service {0}':'Загружаем службу версии {0}', 'Installing service {0}':'Устанавливаем службу версии {0}', 'Restarting the service':'Перезапускаем службу',
    'there is no previous version':'Предыдущая версия не сохранена', 'the new launcher did not start; the previous version is back':'Новый главный экран не запустился. Предыдущая версия восстановлена',
    'the install did not finish':'Установка не завершилась', 'unexpected files in the download':'В архиве обнаружены недопустимые пути', 'could not unpack':'Не удалось распаковать архив',
    'checksum mismatch':'Контрольная сумма не совпадает. Установка отменена', 'bad checksum file':'Некорректный файл контрольной суммы',
    'release has no signature; refusing to install':'У выпуска нет цифровой подписи. Установка запрещена', 'release signature is not valid':'Подпись выпуска не прошла проверку. Установка отменена',
    'signed checksum does not match the asset name':'Подписанная контрольная сумма относится к другому файлу',
    'no trusted release key; install the public key before updating':'Доверенный ключ выпуска не задан. Перед обновлением установите публичный ключ разработчика',
    'API authorization required':'Требуется авторизация для доступа к службе', 'API authorization failed':'Не удалось получить доступ к службе через Homebrew Channel',
    'API authorization timed out':'Homebrew Channel не ответил при авторизации', 'no release published yet':'Версии ещё не опубликованы',
    'Downloading the speech engine (18 MB)':'Загружаем движок распознавания (18 МБ)', 'Downloading the 64-bit C library (27 MB)':'Загружаем 64-битные библиотеки (27 МБ)',
    'Downloading the speech model ({0} of {1})':'Загружаем модель речи: файл {0} из {1}', 'Testing':'Проверяем работу', 'Starting':'Начинаем установку', 'Voice is installed':'Голосовой модуль установлен',
    'Install failed: {0}':'Ошибка установки: {0}', 'This package has no voice program (cytv-asr); update CleanYourTV first.':'В пакете нет программы распознавания cytv-asr. Сначала обновите CleanYourTV.',
    'the server address must start with http:// or https://':'Адрес сервера должен начинаться с http:// или https://',
    'the Home Assistant address must start with http:// or https://':'Адрес Home Assistant должен начинаться с http:// или https://',
    'that model name is not valid':'Недопустимое имя модели', 'set the OpenRouter key first':'Сначала укажите ключ OpenRouter', 'that agent name is not valid':'Недопустимый идентификатор агента',
    'Home Assistant refused the access token':'Home Assistant отклонил токен доступа', 'Home Assistant is not set up':'Home Assistant ещё не настроен',
    'set the Home Assistant address and token first':'Сначала укажите адрес Home Assistant и токен доступа', 'Home Assistant did not answer with JSON':'Home Assistant вернул ответ в неподдерживаемом формате',
    'no OpenRouter key is set':'Ключ OpenRouter не задан', 'OpenRouter returned an empty answer':'OpenRouter вернул пустой ответ',
    'The model tried to use a tool instead of answering. Choose another model.':'Модель запросила внешний инструмент вместо ответа. Выберите другую модель.',
    'the microphone stream did not open':'Не удалось получить звук с микрофона пульта', 'no answer in time':'Время ожидания ответа истекло', 'the answer is too large':'Размер ответа превышает допустимый',
    'no channels found in that playlist':'В плейлисте не найдены каналы', 'loading playlist':'Загружаем плейлист', 'loading guide':'Загружаем программу передач',
    'Live TV setup':'Настройка телеканалов', 'Code shown on the TV':'Код с экрана телевизора', 'Playlist address (M3U)':'Адрес плейлиста M3U', 'Guide address (XMLTV, optional)':'Адрес программы передач XMLTV (необязательно)',
    "leave empty to use the playlist's":'Оставьте пустым, чтобы взять адрес из плейлиста', 'Save':'Сохранить', 'Wrong code.':'Код не совпадает с кодом на телевизоре.',
    'The playlist address must start with http:// or https://':'Адрес плейлиста должен начинаться с http:// или https://',
    'Saved. The TV is loading your channels now; you can close this page.':'Настройки сохранены. Телевизор загружает каналы. Эту страницу можно закрыть.', 'Not found':'Страница не найдена',
    'Voice setup':'Настройка голосового управления', 'OpenRouter key':'Ключ API OpenRouter', '(one is saved; leave empty to keep it)':'(уже сохранён; оставьте поле пустым, чтобы не менять)',
    'choose from the list or type any OpenRouter model name':'Выберите из списка или укажите идентификатор модели OpenRouter', 'Answer with the AI':'Получать ответы ИИ',
    'Instructions for the AI':'Инструкции для ИИ', '(empty: short plain answers)':'(по умолчанию — краткие ответы без разметки)',
    'Home Assistant address':'Адрес Home Assistant', '(optional, Assist)':'(необязательно, для Assist)', 'Home Assistant access token':'Токен доступа Home Assistant',
    '(a long-lived token from your profile page)':'(долгосрочный токен из вашего профиля)', '(a long-lived token from your profile page; one is saved, leave empty to keep it)':'(долгосрочный токен уже сохранён; оставьте поле пустым, чтобы не менять)',
    'Accept a self-signed certificate':'Разрешить самоподписанный сертификат', 'Send the text to your own server':'Отправлять текст на свой сервер', '(optional)':'(необязательно)', 'Server token':'Токен доступа к серверу',
    '(optional; one is saved, leave empty to keep it)':'(уже сохранён; оставьте поле пустым, чтобы не менять)', 'Saved. You can close this page.':'Настройки сохранены. Эту страницу можно закрыть.', 'Too many requests':'Слишком много запросов. Повторите позже.',
    'CleanYourTV report':'Диагностика CleanYourTV', 'Copy':'Скопировать', 'Select all':'Выделить всё', 'Copied':'Скопировано', 'Press and hold the text, then choose Copy':'Нажмите и удерживайте текст, затем выберите «Копировать»',
    'The report is still being prepared; reload in a few seconds.':'Отчёт ещё формируется. Обновите страницу через несколько секунд.',
    'Phone on the':'Подключите телефон к', 'same Wi-Fi':'той же сети Wi-Fi', 'as the TV.':'что и телевизор.', 'Scan the code with the camera.':'Отсканируйте QR-код камерой телефона.',
    'Enter the':'Введите', 'code':'код', 'below and your playlist address.':'с экрана ТВ и адрес своего плейлиста.', 'Tap':'Нажмите', 'then paste it into your message. Addresses and URL paths are masked. This page closes ten minutes after it was opened on the TV.':'и вставьте отчёт в сообщение. IP-адреса и пути в URL скрыты. Страница доступна 10 минут с момента открытия на ТВ.',
    'on the page and paste it into your message.':'на странице и вставьте отчёт в сообщение.', 'Enter your':'Укажите',
    'and model, or your':'и модель либо адрес', 'address and access token, and tap':'и токен доступа Home Assistant, затем нажмите',
    'Classic':'Классическая', 'Midnight':'Полночь', 'Warm':'Тёплая', 'Bloom':'Цветение', 'Compact':'Компактная', 'Large':'Крупные элементы', 'Still':'Без анимации',
    'White':'Белый', 'Blue':'Синий', 'Mint':'Мятный', 'Amber':'Янтарный', 'Rose':'Розовый', 'Purple':'Фиолетовый',
    'OLED black':'Чёрный OLED', 'Large print':'Крупный шрифт',
    'The original look: near-black, white focus, ten columns.':'Исходное оформление: почти чёрный фон, белая рамка фокуса, десять столбцов.',
    'Deep blue with a soft wallpaper and a blue focus.':'Тёмно-синий фон с мягким изображением и синей рамкой фокуса.',
    'Brown and amber with the glow in the accent colour.':'Коричневые и янтарные оттенки с подсветкой акцентного цвета.',
    'Pure black, no ambient glow: unlit pixels stay off.':'Чистый чёрный без фоновой подсветки: чёрные пиксели OLED остаются выключенными.',
    'Eight columns of big tiles and bigger text, easier to read from the sofa.':'Восемь столбцов крупных плиток и увеличенный текст для просмотра с расстояния.',
    'Twelve columns of smaller tiles: more apps on screen.':'Двенадцать столбцов компактных плиток — больше приложений на экране.',
    'No animation and a quiet glow, for anyone who prefers a calm screen.':'Без анимации, со слабой подсветкой — спокойное оформление экрана.',
    'A flower wallpaper with the dock at the bottom in a glass panel, round buttons and a stacked clock. Down opens all apps.':'Цветочный фон, избранное на полупрозрачной нижней панели, круглые кнопки и часы в две строки. Нажмите вниз, чтобы открыть все приложения.',
    'Works without the service: looks for a newer package and installs it through the root service.':'Работает до настройки CleanYourTV: проверяет наличие нового пакета и устанавливает его через Homebrew Channel.',
    'This TV also has LG’s full-screen Home: if Home opens that screen, choose Basic in TV Settings > General > Home Settings > Home Style.':'На этом ТВ также есть полноэкранный Home от LG. Если Home открывает его, выберите базовый стиль в настройках ТВ: Общие → Настройки главного экрана → Стиль главного экрана.',
    'Set the address of your server from SSH on the TV:':'Укажите адрес своего сервера через SSH на телевизоре:',
    'The TV sends POST with JSON {"text":"..."} and Authorization: Bearer <token> if configured. A JSON {"text":"..."} or plain-text reply appears on screen. Only recognised text is sent, never audio.':'Телевизор отправляет POST с JSON {"text":"..."} и заголовком Authorization: Bearer <token>, если задан токен. Ответ в JSON {"text":"..."} или обычным текстом появляется на экране. Передаётся только распознанный текст, не аудио.',
    'Send a POST request:':'Отправьте POST-запрос:', 'Header:':'Заголовок:', 'Body (JSON):':'Тело запроса (JSON):', 'Front door':'Входная дверь', 'Someone is at the door':'Кто-то у двери',
    'OpenRouter setup from SSH on the TV:':'Настройка OpenRouter через SSH на телевизоре:', 'Use "system" for custom instructions. Ask by text:':'Поле "system" задаёт инструкции модели. Пример текстового запроса:',
    'Only question text goes to OpenRouter and the model provider, never audio. The key is stored on the TV.':'В OpenRouter и выбранную модель передаётся только текст запроса, не аудио. Ключ хранится на телевизоре.',
    'Home Assistant (Assist), with a long-lived access token:':'Home Assistant (Assist): используйте долгосрочный токен доступа из своего профиля:',
    'Optional: "route" is ha-first, ha-only or ai-only; "selfSigned":true accepts a self-signed certificate; "agent" is a conversation entity.':'Дополнительно: "route" — ha-first, ha-only или ai-only; "selfSigned":true разрешает самоподписанный сертификат; "agent" — идентификатор агента conversation.*.',
    'The service did not start. Log: /media/developer/cleanyourtv/run/setup.log on the TV. {0}':'Служба не запустилась. Журнал на ТВ: /media/developer/cleanyourtv/run/setup.log. {0}',
    'needs service {0} or newer; update the service first':'Нужна служба версии {0} или новее. Сначала обновите службу',
    'launcher {0} is not in the latest release':'Главного экрана версии {0} нет в выбранном выпуске', 'service {0} is not in the latest release':'Службы версии {0} нет в выбранном выпуске',
    'the download is not launcher {0}':'Загруженный пакет не соответствует главному экрану версии {0}', 'the system refused the install: {0}':'Система отказала в установке: {0}',
    'your server answered {0}':'Ваш сервер вернул HTTP {0}', 'Home Assistant answered {0}':'Home Assistant вернул HTTP {0}',
    'the routing must be one of ha-first, ha-only, ai-only':'Режим должен быть ha-first, ha-only или ai-only',
    'the address is not valid':'Некорректный адрес', 'the address must start with http:// or https://':'Адрес должен начинаться с http:// или https://',
    'no destination: set up Home Assistant, switch on the AI chat or set a server address':'Получатель не задан. Настройте Home Assistant, включите ответы ИИ или укажите свой сервер',
    'an update is running':'Обновление уже выполняется', 'busy':'Служба занята обновлением', 'unknown theme':'Тема не найдена', 'the accent must be a colour like #4c8dff':'Укажите цвет в формате #rrggbb, например #4c8dff',
    'refusing a download over plain http':'Незашифрованная загрузка запрещена', 'download timed out':'Время ожидания загрузки истекло', 'timeout':'Время ожидания истекло',
    'request too large':'Запрос превышает допустимый размер', 'invalid JSON':'Некорректный JSON',
    ' per million input tokens':' за миллион входных токенов',
    ' (test build)':' (тестовая сборка)', 'Update to {0} (test build)':'Обновить до {0} (тестовая сборка)',
    'Last heard':'Распознанная речь', 'Not sent':'Ошибка отправки', 'Last try':'Последняя попытка', 's':'с',
    'Image could not be loaded':'Не удалось загрузить изображение', 'image timed out':'Время ожидания изображения истекло', 'image too large':'Изображение превышает допустимый размер',
    'bad image address':'Некорректный адрес изображения', 'image address must be http(s)':'Адрес изображения должен начинаться с http:// или https://',
    'image address must not point at the TV itself':'В качестве источника изображения нельзя использовать сам телевизор',
    'image server answered {0}':'Сервер изображения вернул HTTP {0}', 'self-signed certificate':'Сервер использует недоверенный самоподписанный сертификат',
    'unable to verify the first certificate':'Не удалось проверить цепочку сертификатов сервера', 'certificate has expired':'Срок действия сертификата сервера истёк',
    'this launcher does not support API authorization':'Эта версия главного экрана не поддерживает защищённый API',
    'no compatible previous launcher; restarting with LG Home':'Совместимая предыдущая версия не сохранена. После перезагрузки откроется главный экран LG',
    'Dock':'Избранные приложения', 'LG Home':'Главный экран LG', 'No channels':'Каналы не найдены', 'no picture':'Нет изображения',
    'GEO':'Геоблокировка', 'NOT 24/7':'По расписанию', 'HEADERS':'HTTP-заголовки',
    'The service ({0}) is older than this launcher needs: update it in the CleanYourTV manager':'Служба версии {0} устарела для этого главного экрана. Обновите её в приложении CleanYourTV',
    'per million input tokens':'за миллион входных токенов', '(test build)':'(тестовая сборка)',
    'Launcher':'Главный экран', 'Service':'Служба', 'Go back to launcher':'Вернуть предыдущий главный экран', 'Update to':'Обновить',
    'Home Assistant (Assist)':'Home Assistant (Assist)', 'voice':'микрофона', 'heard':'Речь распознана', 'idle':'Ожидание',
    'Error: {0}':'Ошибка: {0}', 'guide: {0}':'Программа передач: {0}',
    'the latest release has no package with a checksum':'В последнем выпуске нет пакета с контрольной суммой',
    'the package does not match its checksum; nothing was installed':'Контрольная сумма пакета не совпала. Установка отменена',
    'the system refused the install':'Система отказала в установке', 'the new service did not start; the previous files were restored':'Новая служба не запустилась. Предыдущие файлы восстановлены',
    'voice is not installed':'Голосовой модуль не установлен', 'not a zip file':'Загруженный файл не является ZIP-архивом',
    'the engine package has an unexpected layout':'Структура пакета распознавания речи не соответствует ожидаемой',
    'release has no {0}.sha256, refusing to install an unchecked file':'В выпуске нет файла {0}.sha256. Установка без проверки запрещена',
    'release has no {0}':'В выпуске нет файла {0}', 'release metadata too large':'Размер данных о выпуске превышает допустимый',
    'that does not look like Home Assistant ({0} was not found)':'Сервер не похож на Home Assistant: путь {0} не найден',
    'bad request':'Некорректный запрос', 'bad playlist address':'Некорректный адрес плейлиста', 'no such stream':'Поток не найден',
    'unsafe service directory':'Каталог службы имеет небезопасные права или владельца', 'unsafe API token file':'Файл токена API имеет небезопасный тип, права или владельца',
    'invalid API token':'Файл токена API повреждён', 'unsafe runtime directory':'Служебный каталог имеет небезопасные права или владельца',
    'listening':'Слушаем', 'already listening':'Микрофон уже включён', 'installing':'Идёт установка', 'already up to date':'Установлена актуальная версия',
    'installed {0}, latest {1}':'Установлено: {0}. Последняя версия: {1}', 'downloading {0}':'Загружаем {0}', 'installing {0}':'Устанавливаем {0}',
    'restarting the service':'Перезапускаем службу', 'updated to {0}. Close CleanYourTV and open it again.':'Установлена версия {0}. Закройте и снова откройте CleanYourTV.',
    'too many redirects':'Сервер возвращает слишком много перенаправлений', 'HTTP {0} from {1}':'Сервер {1} вернул HTTP {0}',
    'checksum mismatch for {0}; nothing was installed':'Контрольная сумма файла {0} не совпала. Установка отменена',
    'the recogniser stopped ({0}): {1}':'Распознавание речи остановлено (код {0}): {1}',
    'OpenRouter answered {0}':'OpenRouter вернул HTTP {0}', 'the model list could not be read':'Не удалось загрузить список моделей', 'Done':'Готово',
    'registering the overlay apps (the screen blinks once)':'Регистрируем окна источников и уведомлений. Экран один раз мигнёт',
    'run as root':'Для установки нужны права root', 'this does not look like webOS (no luna-send)':'Система не похожа на webOS: команда luna-send не найдена',
    '{0} not found: root with the Homebrew Channel is required (https://rootmy.tv)':'Каталог {0} не найден. Нужен root-доступ через Homebrew Channel (https://rootmy.tv)',
    '/media/developer is not writable':'Каталог /media/developer недоступен для записи', 'missing tool: {0}':'Не найдена необходимая программа: {0}',
    'this TV has no systemd (webOS older than 5): CleanYourTV needs a newer webOS and cannot be set up here. Nothing was changed.':'На телевизоре нет systemd. Нужна webOS 5 или новее. Настройка отменена без изменений',
    "this TV's Node.js ({0}) is too old for the service: CleanYourTV needs a newer webOS and cannot be set up here. Nothing was changed.":'Версия Node.js ({0}) не поддерживается. Нужна более новая webOS. Настройка отменена без изменений',
    'the service files are incomplete in {0}':'В каталоге {0} отсутствует часть файлов службы', 'stock Home app not found at {0}':'Оригинальный главный экран LG не найден в {0}',
    'could not create service directory':'Не удалось создать каталог службы', 'service directory must not be a symbolic link':'Каталог службы не должен быть символической ссылкой',
    'could not secure service directory':'Не удалось установить безопасные права на каталог службы',
    'Home is already replaced but no backup exists; reboot the TV once, then run this again':'Главный экран уже заменён, но резервная копия не найдена. Перезагрузите ТВ и повторите настройку',
    'picture notifications use the {0} window on this TV (webOS SDK {1})':'Выбран тип окна уведомлений: {0} (webOS SDK {1})',
    'TV: {0}, firmware {1}, webOS SDK {2}':'Телевизор: {0}, прошивка {1}, webOS SDK {2}',
    "this firmware is in the compatibility list ({0}); LG's Home app is '{1}'":'Прошивка есть в списке совместимости ({0}). Тип главного экрана LG: {1}',
    "firmware {0} is not in the compatibility list; continuing because LG's Home is the flutter or web kind this was written for. The original state is saved and a failed start restarts the TV with LG's Home.":'Прошивка {0} не проверена, но тип главного экрана поддерживается. Продолжаем с резервной копией; при сбое вернётся экран LG',
    "firmware {0} is not in the compatibility list and LG's Home app is '{1}', not the flutter or web app this was tested with; continuing because of --force":'Прошивка {0} и тип главного экрана {1} не проверены. Продолжаем, поскольку задан --force',
    "LG's Home app looks different from what this expects (found: {0}; firmware {1} is not in the compatibility list). To try anyway use 'Set up anyway' in the app, or run bootstrap.sh install --force. The original is saved and a failed start is rolled back with a restart.":'Главный экран LG отличается от поддерживаемого: {0}, прошивка {1}. Для попытки установки выберите «Установить на этой прошивке» или задайте --force. При сбое будет восстановлен экран LG',
    'launcher {0} in place':'Главный экран версии {0} подготовлен', 'service {0} installed in {1}; boot scripts in {2}':'Служба {0} установлена в {1}; сценарии автозапуска — в {2}',
    'done. Everything takes effect at the next reboot.':'Готово. Изменения вступят в силу после перезагрузки',
    'the new service ({0}) did not come up; going back to the previous files':'Новая служба не запустилась ({0}). Восстанавливаем предыдущие файлы',
    'service {0} is running':'Служба версии {0} работает', 'starting (the screen blinks once while the system app manager restarts)':'Запускаем службу. При перезапуске диспетчера приложений экран один раз мигнёт',
    'checking that the new Home came up...':'Проверяем запуск нового главного экрана…',
    'the new Home did not come up (app type: {0}, service: {1}); rolling back':'Главный экран не запустился (тип: {0}, служба: {1}). Восстанавливаем исходное состояние',
    "rolled back: the boot scripts are removed and the TV restarts with LG's Home. Details: /media/developer/cleanyourtv/run/setup.log and setup.log.service":'Настройка отменена. Автозапуск удалён; после перезагрузки откроется экран LG. Журналы: /media/developer/cleanyourtv/run/setup.log и setup.log.service',
    'done. Hold OK on an app to customise the dock, or use the Customise button at the top right.':'Готово. Для настройки избранного удерживайте OK на приложении или выберите «Настроить экран» справа вверху',
    "This TV also has LG's full-screen Home. If the Home button opens that instead of CleanYourTV: TV Settings > General > Home Settings > Home Style > Basic.":'Если Home открывает полноэкранное меню LG, выберите базовый стиль в настройках ТВ: Общие → Настройки главного экрана → Стиль главного экрана',
    "Back to LG's Home any time: switch off 'CleanYourTV as Home' in the manager app, or run: sh {0}/undo-home.sh":'Чтобы вернуть экран LG, отключите «Главный экран CleanYourTV» в менеджере или выполните sh {0}/undo-home.sh',
    'Warning: {0}':'Предупреждение: {0}',
    'the model list is too large':'Размер списка моделей превышает допустимый', 'OpenRouter did not answer':'OpenRouter не ответил вовремя',
    'send {"text": "..."}':'Передайте текст запроса в JSON-поле "text"', 'POST expected':'Для этой операции нужен POST-запрос',
    'not a test build':'Недопустимый идентификатор тестовой сборки', 'unknown action':'Неизвестная операция',
    'not a valid address':'Некорректный адрес', 'address must start with http:// or https://':'Адрес должен начинаться с http:// или https://',
    'timed out':'Время ожидания истекло', 'nothing to show':'В уведомлении нет текста или изображения',
    'Home Assistant: {0}':'Home Assistant: {0}', 'OpenRouter: {0}':'OpenRouter: {0}', 'Notification':'Уведомление'
  };
  var HELP = {
    'Launcher':'Главный экран телевизора. Перед обновлением проверяются цифровая подпись выпуска и SHA-256. Если новая версия не запустится, будет восстановлена предыдущая.',
    'Service':'Фоновая служба: телеканалы, уведомления, кнопки пульта и обновления. При неудачном обновлении восстанавливаются прежние файлы.',
    'Check for updates':'Проверяет наличие новой версии. Установка начинается только после вашего выбора.',
    'Update channel':'Для обычного использования выбирайте стабильные версии. Тестовая сборка предназначена для проверки изменений и может содержать ошибки. После выбора канала установите доступные обновления главного экрана и службы.',
    'Go back to launcher':'Восстанавливает сохранённую версию главного экрана. Более новую версию можно будет установить повторно.',
    'CleanYourTV as Home':'Во включённом состоянии кнопка Home открывает CleanYourTV, в выключенном — главный экран LG. Смена требует перезагрузки ТВ; фоновая служба продолжает работать в обоих случаях.',
    'Debloat LG’s ads and telemetry':'Приостанавливает службы рекламы, рекомендаций и телеметрии LG и блокирует несколько рекламных адресов. Системные приложения не удаляются. Действует, пока главным экраном выбран CleanYourTV.',
    'Theme':'Цвета, размер плиток и текста, количество столбцов, часы, подсветка, анимация и фон. Темы поставляются в пакете; акцентный цвет можно выбрать отдельно.',
    'Accent colour':'Цвет рамки фокуса и выделенных элементов. «Цвет темы» возвращает исходный цвет выбранной темы.',
    'Network notifications':'Позволяет устройствам вашей сети отправлять уведомления с изображениями через POST-запрос с токеном доступа. По умолчанию выключено.',
    'Accept notifications from the network':'Открывает порт 8767 для POST /notify. Любое устройство с доступом к сети и токеном может показать уведомление на телевизоре.',
    'How to send':'Показывает адрес, токен доступа и пример запроса.', 'New token':'Заменяет токен доступа. Устройства с прежним токеном больше не смогут отправлять уведомления.',
    'Voice':'Дополнительный модуль: преобразует речь с пульта в текст прямо на ТВ. Текущая модель Moonshine распознаёт только английскую речь. Аудио не отправляется в сеть. Загрузка — около 80 МБ.',
    'Install voice':'Загружает движок, 64-битные библиотеки и модель речи, проверяет контрольные суммы и выполняет пробный запуск. Системные каталоги не изменяются.',
    'Listen on the voice button':'Нажатие назначенной кнопки включает микрофон. Результат распознавания появляется в карточке на экране.',
    'AI chat (OpenRouter)':'Отправляет распознанный текст в OpenRouter и выбранной модели. Для работы нужен ваш ключ API. Аудио не передаётся.',
    'Set up from your phone':'Откройте QR-код телефоном в той же сети Wi-Fi. На странице можно указать ключ OpenRouter, модель, Home Assistant и свой сервер.',
    'Model':'Модель, которая отвечает на запросы. Список и цены за миллион входных токенов загружаются из OpenRouter. На странице телефона доступен полный список.',
    'Set up with commands':'Команды для настройки ключа, модели и инструкций через SSH, а также пример запроса текстом.',
    'Forget the conversation':'Удаляет контекст текущего диалога с ИИ и Home Assistant. Обычно контекст хранится до 10 минут бездействия.',
    'Home Assistant (Assist)':'Отправляет текст в Assist и показывает ответ. Укажите адрес и долгосрочный токен из профиля Home Assistant. Выбор этой строки проверяет подключение.',
    'Which answers first':'«Сначала Home Assistant» направляет запрос в Assist, а при непонимании — в ИИ. Другие режимы используют только Home Assistant или только ИИ.',
    'Assist agent':'Агент диалога Home Assistant. По умолчанию используется встроенный агент; доступные альтернативы загружаются из вашей системы.',
    'Switch off LG’s voice assistant':'Приостанавливает помощник LG, пока включён голосовой модуль CleanYourTV. Это предотвращает одновременную реакцию на кнопку. Перезагрузка или отключение настройки возвращает помощник LG.',
    'Learn the voice button':'Определяет код кнопки для запуска микрофона. Если кнопка микрофона не определяется, можно назначить другую свободную кнопку.',
    'Try it now':'Включает микрофон без нажатия назначенной кнопки. Говорите после появления карточки.',
    'Send the text to':'Адрес вашего сервера для распознанного текста. Показывает команды настройки. Если сервер и другие получатели не заданы, текст остаётся на экране.',
    'Remove voice':'Удаляет загруженный движок и модель речи. Остальные функции CleanYourTV сохраняются.',
    'Input key':'Открывает список источников CleanYourTV поверх текущего приложения. Здесь можно отключить перехват Input или назначить кнопку.',
    'Share log':'Открывает диагностический отчёт на телефоне по QR-коду. IP-адреса и пути в URL скрыты. Ссылка действует 10 минут.',
    'Uninstall':'Удаляет приложения CleanYourTV, сценарии автозапуска и настройки. После перезагрузки восстанавливается главный экран LG.',
    'Input key opens our Inputs list':'Включено — кнопка Input открывает список CleanYourTV. Выключено — сразу возвращается список источников LG.',
    'Learn the Input key':'Определяет код Input и проверяет открытие списка источников. Стандартный код — 241. Сброс возвращает его.',
    'Live TV':'Включение телеканалов, настройка M3U-плейлиста и программы передач XMLTV, очистка данных и назначение Guide.',
    'Show Live TV':'Показывает телеканалы на главном экране и в источниках, разрешает назначение Guide. При отключении используются функции LG. Ваш плейлист сохраняется.',
    'Playlist':'M3U-плейлист и программа передач XMLTV. Для настройки откройте QR-код на телефоне, введите адрес плейлиста и шестизначный код с ТВ.',
    'Refresh playlist and guide':'Повторно загружает плейлист и программу передач. Автоматическое обновление также выполняется дважды в сутки.',
    'Clear recent channels':'Очищает недавние каналы и отметки ошибок воспроизведения. Избранное сохраняется.',
    'Remove the playlist':'Удаляет адрес плейлиста, каналы, программу передач и избранное с телевизора.',
    'Yes, remove the playlist':'Удаляет плейлист и все связанные с ним данные. Позже его можно настроить заново.',
    'Learn the Guide key':'Назначает Guide для открытия программы передач ваших телеканалов. Работает только при включённом разделе. Сброс возвращает программу передач LG.',
    'Learn the Home key':'Необязательно: сохраняет код кнопки Home для диагностики. Действие самой кнопки не меняется.',
    'Back':'Возврат к предыдущему экрану.', 'Cancel':'Закрывает подтверждение без изменений.',
    'Yes, remove CleanYourTV':'Удаляет приложения CleanYourTV, автозапуск и настройки, затем перезагружает телевизор.',
    'Yes, use CleanYourTV as Home':'После перезагрузки главным экраном станет CleanYourTV.',
    'Yes, use LG’s Home':'После перезагрузки откроется главный экран LG. Вернуть CleanYourTV можно в этих настройках.',
    'Update to':'Доступна новая версия пакета. Перед первой настройкой рекомендуется обновиться: в пакете могут быть исправления для вашей прошивки.',
    'Take over the Input key':'Кнопка Input будет открывать список источников CleanYourTV. Эту настройку можно изменить позже.',
    'Set up now':'Устанавливает главный экран, добавляет автозапуск и запускает службу. Занимает около минуты, экран один раз мигнёт. При сбое запуска ТВ перезагрузится с главным экраном LG.',
    'Set up anyway':'Прошивка не проверена, а главный экран LG отличается от поддерживаемого варианта. Будет предпринята попытка установки; при сбое запуска восстановится экран LG.'
  };
  // Add a complete language here. English source strings are keys; tools/i18n-keys.json locks their count and fingerprint.
  var catalogs = { ru: { messages: RU, help: HELP } }, templateCache = {};
  function hasCatalog(lang) { return Object.prototype.hasOwnProperty.call(catalogs, lang); }
  function templatesFor(lang) {
    if (templateCache[lang]) return templateCache[lang];
    var messages = catalogs[lang].messages, templates = [], key;
    for (key in messages) if (/\{\d+\}/.test(key)) {
      var parts = key.split(/(\{\d+\})/), pattern = '^', indices = [];
      for (var i = 0; i < parts.length; i++) {
        if (/^\{\d+\}$/.test(parts[i])) { pattern += '([\\s\\S]+?)'; indices.push(+parts[i].slice(1, -1)); }
        else pattern += parts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      templates.push({ re: new RegExp(pattern + '$'), key: key, value: messages[key], indices: indices });
    }
    // Specific templates precede generic prefixes such as "Launcher {0}".
    templates.sort(function (a, b) { return b.re.source.length - a.re.source.length; });
    templateCache[lang] = templates; return templates;
  }
  function language(value) { return String(value || 'en').trim().toLowerCase().split(/[-_,;]/)[0]; }
  var current = typeof window !== 'undefined' ? language((window.webOSSystem && window.webOSSystem.locale) || navigator.language) : 'en';
  function t(value, lang, depth) {
    var text = String(value == null ? '' : value); lang = language(lang || current); depth = depth || 0;
    if (!hasCatalog(lang) || !text || depth > 4) return text;
    var messages = catalogs[lang].messages, templates = templatesFor(lang);
    if (Object.prototype.hasOwnProperty.call(messages, text)) return messages[text];
    // Formatting is not part of a message key. Preserve it around the translated text.
    var trimmed = text.trim();
    if (trimmed !== text) return text.slice(0, text.indexOf(trimmed)) + t(trimmed, lang, depth + 1) + text.slice(text.indexOf(trimmed) + trimmed.length);
    for (var i = 0; i < templates.length; i++) {
      var entry = templates[i];
      // A generic capture must not swallow the next independent line/status.
      if (/\n| · /.test(text) && !/\n| · /.test(entry.key)) continue;
      var match = entry.re.exec(text);
      if (match) return entry.value.replace(/\{(\d+)\}/g, function (_, n) { return match[entry.indices.indexOf(+n) + 1]; });
    }
    if (/\n| · /.test(text)) return text.split(/(\n| · )/).map(function (part) { return t(part, lang, depth + 1); }).join('');
    return text;
  }
  function format(key, values, lang) {
    return t(key, lang).replace(/\{(\d+)\}/g, function (slot, n) { return values && values[n] !== undefined ? String(values[n]) : slot; });
  }
  function helpText(key, fallback, lang) {
    var code = language(lang || current), catalog = hasCatalog(code) ? catalogs[code] : null;
    return catalog && Object.prototype.hasOwnProperty.call(catalog.help, key) ? catalog.help[key] : (fallback || '');
  }
  function error(value, lang, depth) {
    var text = String(value || ''), wrappers = ['guide: ', 'Install failed: ', 'Update failed: ', 'Could not check: ', 'Setup stopped: ', 'Could not start the setup: ', 'Home Assistant: ', 'OpenRouter: '];
    depth = depth || 0;
    if (depth < 4) for (var i = 0; i < wrappers.length; i++) if (text.indexOf(wrappers[i]) === 0) {
      return format(wrappers[i] + '{0}', [error(text.slice(wrappers[i].length), lang, depth + 1)], lang);
    }
    var translated = t(text, lang);
    // Unknown OS/provider details remain verbatim, with a localised error label.
    return translated === text && text ? format('Error: {0}', [text], lang) : translated;
  }
  function logLine(value, lang) {
    var text = String(value || '').replace(/^\[cleanyourtv\] /, '');
    if (/^ERROR[: ]/.test(text)) return error(text.replace(/^ERROR:?\s*/, ''), lang);
    if (/^WARN(?:ING)?[: ]/.test(text)) return format('Warning: {0}', [t(text.replace(/^WARN(?:ING)?:?\s*/, ''), lang)], lang);
    return t(text, lang);
  }
  function html(source, lang) {
    if (!hasCatalog(language(lang || current))) return source;
    // Only static markup uses this: script/style bodies, values and URLs are never translated.
    return source.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<textarea\b[\s\S]*?<\/textarea>|<option\b[\s\S]*?<\/option>|<[^>]+>)/gi).map(function (part) {
      if (/^<(script|style|textarea|option)\b/i.test(part)) return part;
      if (part.charAt(0) === '<') return part.replace(/(placeholder=")([^"]*)(")/g, function (_, a, text, b) { return a + t(text, lang).replace(/"/g, '&quot;') + b; });
      return t(part, lang);
    }).join('');
  }
  var api = { t: t, format: format, error: error, logLine: logLine, html: html, helpText: helpText, language: language, catalogs: catalogs, ru: RU, help: hasCatalog(current) ? catalogs[current].help : {} };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CYTV_I18N = api;
})(this);
