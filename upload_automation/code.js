/***********************
 * CONFIG
 ***********************/
const BASE_FOLDER_ID = '1utXOe7Q12qg3WdnU0Sixqq_-34ALqvxd';
const PUBLISHED_FOLDER_ID = '1E5S4Hu1hi1Bkq1mOTUbk7vPmxXZsQKw5';

/***********************
 * ENTRY POINT
 ***********************/
function listEssaysInBaseFolder() {
  const baseFolder = DriveApp.getFolderById(BASE_FOLDER_ID);
  const files = baseFolder.getFiles();

  Logger.log('Scanning base folder...');

  while (files.hasNext()) {
    const file = files.next();

    // Only Google Docs
    if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
      Logger.log(`Found Doc → Name: ${file.getName()}, ID: ${file.getId()}`);
    }
  }

  Logger.log('Scan complete.');
}
