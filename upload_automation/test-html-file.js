/***********************
 * TEST: FULL HTML PREVIEW (RAW - NO SANITIZATION)
 ***********************/
function exportFullHtmlPreview() {
    const baseFolder = DriveApp.getFolderById(BASE_FOLDER_ID);
    const files = baseFolder.getFiles();

    while (files.hasNext()) {
        const file = files.next();

        if (file.getMimeType() !== MimeType.GOOGLE_DOCS) continue;

        const docId = file.getId();
        const title = file.getName();

        const html = exportDocAsHtml(docId);

        const previewFileName = `__preview__ ${sanitizeFileName(title)}.html`;

        baseFolder.createFile(
            previewFileName,
            html,
            MimeType.HTML
        );

        Logger.log(`Preview HTML file created: ${previewFileName}`);

        // ⚠️ Only create ONE preview file
        break;
    }
}

/***********************
 * TEST: CLEAN HTML PREVIEW (SIMPLE)
 ***********************/
function exportCleanHtmlPreview() {
    const baseFolder = DriveApp.getFolderById(BASE_FOLDER_ID);
    const files = baseFolder.getFiles();

    while (files.hasNext()) {
        const file = files.next();

        if (file.getMimeType() !== MimeType.GOOGLE_DOCS) continue;

        const docId = file.getId();
        const rawHtml = exportDocAsHtml(docId);

        // Parse and sanitize
        const parsed = parseGoogleDocHtml(rawHtml);

        // Create a simple preview HTML to see the result
        const previewHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${parsed.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
        .description { font-style: italic; color: #555; border-left: 3px solid #ddd; padding-left: 15px; margin-bottom: 30px; }
    </style>
</head>
<body>
    <h1>${parsed.title}</h1>
    <div class="meta">
        <strong>Date:</strong> ${parsed.date}<br>
        <strong>Read time:</strong> ${parsed.readTime} minutes
    </div>
    <div class="description">${parsed.description}</div>
    <hr>
    <div class="body">
        ${parsed.bodyHtml}
    </div>
</body>
</html>`;

        const cleanFileName = `__clean__ ${sanitizeFileName(parsed.title)}.html`;

        baseFolder.createFile(
            cleanFileName,
            previewHtml,
            MimeType.HTML
        );

        Logger.log(`✅ Clean HTML created: ${cleanFileName}`);
        Logger.log(`   Title: ${parsed.title}`);
        Logger.log(`   Date: ${parsed.date}`);
        Logger.log(`   Description: ${parsed.description.substring(0, 100)}...`);
        Logger.log(`   Read time: ${parsed.readTime} minutes`);

        // ⚠️ Only process ONE file
        break;
    }
}

/***********************
 * 🚀 MAIN: GENERATE BLOG HTML FROM TEMPLATE
 * This creates the final blog-ready HTML file
 ***********************/
function generateBlogHtml() {
    const baseFolder = DriveApp.getFolderById(BASE_FOLDER_ID);
    const files = baseFolder.getFiles();

    // Load the blog template
    const template = loadBlogTemplate();

    while (files.hasNext()) {
        const file = files.next();

        if (file.getMimeType() !== MimeType.GOOGLE_DOCS) continue;

        const docId = file.getId();
        const rawHtml = exportDocAsHtml(docId);

        // Parse and sanitize
        const parsed = parseGoogleDocHtml(rawHtml);

        // Generate slug for filename and URL
        const slug = slugify(parsed.title);

        // Fill the template with parsed data
        const finalHtml = fillTemplate(template, {
            title: parsed.title,
            description: parsed.description,
            date: parsed.date,
            readTime: parsed.readTime,
            body: parsed.bodyHtml,
            slug: slug
        });

        // Create the final blog HTML file
        const outputFileName = `${slug}.html`;

        baseFolder.createFile(
            outputFileName,
            finalHtml,
            MimeType.HTML
        );

        Logger.log(`🎉 Blog HTML created: ${outputFileName}`);
        Logger.log(`   Title: ${parsed.title}`);
        Logger.log(`   Slug: ${slug}`);
        Logger.log(`   Date: ${parsed.date}`);
        Logger.log(`   Read time: ${parsed.readTime} minutes`);

        // ⚠️ Only process ONE file for now
        break;
    }
}

/***********************
 * LOAD BLOG TEMPLATE FROM DRIVE
 * Looks for blog_template.html in Drive
 ***********************/
function loadBlogTemplate() {
    // Search for blog_template.html in Drive
    const files = DriveApp.searchFiles('name = "blog_template.html"');
    
    if (!files.hasNext()) {
        throw new Error('blog_template.html not found in Drive! Please upload it first.');
    }
    
    const templateFile = files.next();
    return templateFile.getBlob().getDataAsString();
}

/***********************
 * TEMPLATE FILLER
 * Replaces {{PLACEHOLDER}} with actual data
 ***********************/
function fillTemplate(template, data) {
    return template
        .replace(/\{\{TITLE\}\}/g, escapeHtml(data.title))
        .replace(/\{\{DESCRIPTION\}\}/g, escapeHtml(data.description))
        .replace(/\{\{DATE\}\}/g, escapeHtml(data.date))
        .replace(/\{\{READTIME\}\}/g, data.readTime)
        .replace(/\{\{SLUG\}\}/g, data.slug)
        .replace(/\{\{BODY\}\}/g, data.body); // Body is already HTML, don't escape
}

/***********************
 * ESCAPE HTML FOR ATTRIBUTES
 * Prevents breaking HTML in title/meta tags
 ***********************/
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/***********************
 * EXPORT HELPER
 ***********************/
function exportDocAsHtml(docId) {
    const url = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/html`;
    const token = ScriptApp.getOAuthToken();

    const response = UrlFetchApp.fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return response.getContentText();
}

/***********************
 * MAIN PARSER
 * Extracts title, date, description, body, readTime
 ***********************/
function parseGoogleDocHtml(html) {
    // 1. Extract body content only
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let body = bodyMatch ? bodyMatch[1] : html;

    // 2. Remove <style> blocks completely
    body = body.replace(/<style[\s\S]*?<\/style>/gi, '');

    // 3. Extract TITLE from class="title"
    const titleMatch = body.match(/<p[^>]*class="title"[^>]*>([\s\S]*?)<\/p>/i);
    let fullTitle = 'Untitled';
    if (titleMatch) {
        fullTitle = stripHtml(titleMatch[1]);
        body = body.replace(titleMatch[0], ''); // Remove title from body
    }

    // 4. Split date and title (format: "16 January | God needs us...")
    let datePart = '';
    let titlePart = fullTitle;
    if (fullTitle.includes('|')) {
        const parts = fullTitle.split('|');
        datePart = parts[0].trim();
        titlePart = parts.slice(1).join('|').trim();
    }

    // 5. Extract DESCRIPTION from class="subtitle"
    const subtitleMatch = body.match(/<p[^>]*class="subtitle"[^>]*>([\s\S]*?)<\/p>/i);
    let description = '';
    if (subtitleMatch) {
        description = stripHtml(subtitleMatch[1]);
        body = body.replace(subtitleMatch[0], ''); // Remove subtitle from body
    }

    // 6. Now sanitize the remaining body
    body = sanitizeBodyHtml(body);

    // 7. Calculate read time
    const wordCount = stripHtml(body).split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    return {
        title: titlePart,
        date: datePart,
        description: description,
        bodyHtml: body.trim(),
        readTime: readTime
    };
}

/***********************
 * BODY SANITIZER
 * Cleans Google Docs HTML mess
 ***********************/
function sanitizeBodyHtml(html) {
    let result = html;

    // 1. Convert bold spans to <strong>
    result = result.replace(/<span[^>]*font-weight:\s*700[^>]*>([\s\S]*?)<\/span>/gi, '<strong>$1</strong>');
    result = result.replace(/<span[^>]*font-weight:\s*bold[^>]*>([\s\S]*?)<\/span>/gi, '<strong>$1</strong>');

    // 2. Convert italic spans to <em>
    result = result.replace(/<span[^>]*font-style:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, '<em>$1</em>');

    // 3. Convert underline spans to <u>
    result = result.replace(/<span[^>]*text-decoration:\s*underline[^>]*>([\s\S]*?)<\/span>/gi, '<u>$1</u>');

    // 4. Clean Google redirect URLs in links
    result = result.replace(
        /href="https:\/\/www\.google\.com\/url\?q=([^&"]+)[^"]*"/gi,
        function(match, url) {
            return 'href="' + decodeURIComponent(url) + '"';
        }
    );

    // 5. Remove remaining spans (but keep inner content)
    result = result.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

    // 6. Remove all style attributes
    result = result.replace(/\s*style="[^"]*"/gi, '');

    // 7. Remove all class attributes
    result = result.replace(/\s*class="[^"]*"/gi, '');

    // 8. Remove all id attributes
    result = result.replace(/\s*id="[^"]*"/gi, '');

    // 9. Clean up headings (keep the tags, remove attributes)
    result = result.replace(/<(h[1-6])([^>]*)>/gi, '<$1>');

    // 10. Clean up lists (keep structure, remove attributes)
    result = result.replace(/<(ul|ol|li)([^>]*)>/gi, '<$1>');

    // 11. Clean up paragraphs
    result = result.replace(/<p([^>]*)>/gi, '<p>');

    // 12. Clean up links (remove style/class from <a>)
    result = result.replace(/<a([^>]*)(href="[^"]*")([^>]*)>/gi, '<a $2>');

    // 13. Remove empty paragraphs (paragraphs with only whitespace or &nbsp;)
    result = result.replace(/<p>\s*(&nbsp;)?\s*<\/p>/gi, '');
    result = result.replace(/<p><\/p>/gi, '');

    // 14. Decode HTML entities
    result = decodeHtmlEntities(result);

    // 15. Clean up excessive whitespace and newlines
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    result = result.trim();

    return result;
}

/***********************
 * HTML ENTITY DECODER
 ***********************/
function decodeHtmlEntities(text) {
    const entities = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&rsquo;': "'",
        '&lsquo;': "'",
        '&rdquo;': '"',
        '&ldquo;': '"',
        '&ndash;': '–',
        '&mdash;': '—',
        '&hellip;': '…',
        '&copy;': '©',
        '&reg;': '®',
        '&trade;': '™',
        '&times;': '×',
        '&divide;': '÷',
        '&plusmn;': '±',
        '&frac12;': '½',
        '&frac14;': '¼',
        '&frac34;': '¾',
        '&deg;': '°',
        '&euro;': '€',
        '&pound;': '£',
        '&yen;': '¥',
        '&cent;': '¢',
    };

    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
        result = result.split(entity).join(char);
    }

    // Handle numeric entities like &#8217;
    result = result.replace(/&#(\d+);/g, function(match, dec) {
        return String.fromCharCode(dec);
    });

    return result;
}

/***********************
 * STRIP HTML TAGS
 ***********************/
function stripHtml(html) {
    return html.replace(/<[^>]+>/g, '').trim();
}

/***********************
 * FILENAME SANITIZER
 ***********************/
function sanitizeFileName(name) {
    return name.replace(/[\/\\:?*"<>|]/g, '');
}

/***********************
 * SLUGIFY (for URL-friendly filenames)
 ***********************/
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
