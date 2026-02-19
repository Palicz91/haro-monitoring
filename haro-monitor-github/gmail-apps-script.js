/**
 * HARO Monitor - Gmail Apps Script
 * 
 * Monitors incoming HARO (Help a Reporter Out) emails and forwards them
 * to Supabase Edge Function for processing and scoring.
 * 
 * Setup:
 * 1. Set Script Properties:
 *    - EDGE_FUNCTION_URL: https://your-project.supabase.co/functions/v1/haro-monitor
 *    - CRON_SECRET: your-secret-key
 * 2. Add time-driven trigger for checkHaroEmails() every 15 minutes
 * 3. Run testWithLatestHaro() first to test parsing
 */

/**
 * Main function - checks for new HARO emails and processes them
 */
function checkHaroEmails() {
  const edgeFunctionUrl = PropertiesService.getScriptProperties().getProperty('EDGE_FUNCTION_URL');
  const cronSecret = PropertiesService.getScriptProperties().getProperty('CRON_SECRET');
  
  if (!edgeFunctionUrl || !cronSecret) {
    Logger.log('ERROR: Missing EDGE_FUNCTION_URL or CRON_SECRET in Script Properties');
    return;
  }
  
  // Create or get existing label
  let label;
  try {
    label = GmailApp.getUserLabelByName('haro-processed');
  } catch (e) {
    label = GmailApp.createLabel('haro-processed');
  }
  
  // Search for unprocessed HARO emails from the last 7 days
  const query = '(from:haro@helpareporter.com OR from:haro@helpareporterout.com OR from:help-a-reporter@cisionus.com) newer_than:7d -label:haro-processed';
  const threads = GmailApp.search(query, 0, 10);
  
  Logger.log(`Found ${threads.length} unprocessed HARO threads`);
  
  for (const thread of threads) {
    const messages = thread.getMessages();
    
    for (const message of messages) {
      const subject = message.getSubject();
      const body = message.getPlainBody();
      const date = message.getDate();
      
      // Skip if not a HARO digest
      if (!isHaroDigest(subject)) {
        Logger.log('Skipping non-digest: ' + subject);
        continue;
      }
      
      Logger.log('Processing HARO email: ' + subject + ' (' + date + ')');
      
      try {
        const response = UrlFetchApp.fetch(edgeFunctionUrl, {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'Authorization': 'Bearer ' + cronSecret,
          },
          payload: JSON.stringify({
            email_body: body,
            email_subject: subject,
            email_date: date.toISOString(),
            source: 'gmail-apps-script',
          }),
          muteHttpExceptions: true,
        });
        
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();
        
        Logger.log('Response ' + responseCode + ': ' + responseBody.substring(0, 500));
        
        if (responseCode === 200) {
          // Mark as processed
          thread.addLabel(label);
          Logger.log('Successfully processed and labeled');
        } else {
          Logger.log('ERROR: Edge function returned ' + responseCode);
        }
      } catch (e) {
        Logger.log('ERROR sending to edge function: ' + e.message);
      }
    }
  }
}

/**
 * Checks if email subject indicates a HARO digest
 */
function isHaroDigest(subject) {
  const lower = subject.toLowerCase();
  return (
    lower.includes('haro') ||
    lower.includes('help a reporter') ||
    lower.includes('journalist query') ||
    lower.includes('media opportunity') ||
    lower.includes('pitch') ||
    lower.includes('source needed')
  );
}

/**
 * Test function - processes the most recent HARO email to verify parsing
 * Run this manually first to test your setup
 */
function testWithLatestHaro() {
  Logger.log('=== TESTING HARO EMAIL PARSING ===');
  
  const threads = GmailApp.search('(from:haro@helpareporter.com OR from:haro@helpareporterout.com OR from:help-a-reporter@cisionus.com) newer_than:7d', 0, 1);
  
  if (threads.length === 0) {
    Logger.log('❌ No HARO emails found in the last 7 days');
    Logger.log('Make sure you are subscribed to HARO and have received at least one email');
    return;
  }
  
  const message = threads[0].getMessages()[0];
  const subject = message.getSubject();
  const body = message.getPlainBody();
  const date = message.getDate();
  
  Logger.log('✅ Found HARO email:');
  Logger.log('📧 Subject: ' + subject);
  Logger.log('📅 Date: ' + date);
  Logger.log('📏 Body length: ' + body.length + ' characters');
  Logger.log('');
  
  // Show preview of body structure
  Logger.log('📄 Body preview (first 500 chars):');
  Logger.log(body.substring(0, 500) + '...');
  Logger.log('');
  
  // Try to identify query sections
  const sections = body.split(/\n(?=\d+\))/);
  Logger.log('🔍 Found ' + sections.length + ' potential query sections');
  
  // Show first few section titles
  for (let i = 0; i < Math.min(3, sections.length); i++) {
    const titleMatch = sections[i].match(/Summary:\s*(.+?)(?:\n|Name:)/s);
    if (titleMatch) {
      Logger.log('   ' + (i + 1) + '. ' + titleMatch[1].trim());
    }
  }
  
  Logger.log('');
  Logger.log('✅ Test complete! If you see query titles above, parsing should work.');
  Logger.log('💡 Now set up the time-driven trigger for checkHaroEmails()');
}

/**
 * Configuration test - verifies Script Properties are set correctly
 */
function testConfiguration() {
  Logger.log('=== TESTING CONFIGURATION ===');
  
  const edgeFunctionUrl = PropertiesService.getScriptProperties().getProperty('EDGE_FUNCTION_URL');
  const cronSecret = PropertiesService.getScriptProperties().getProperty('CRON_SECRET');
  
  if (!edgeFunctionUrl) {
    Logger.log('❌ EDGE_FUNCTION_URL not set in Script Properties');
    Logger.log('💡 Go to Project Settings > Script Properties and add it');
  } else {
    Logger.log('✅ EDGE_FUNCTION_URL: ' + edgeFunctionUrl);
  }
  
  if (!cronSecret) {
    Logger.log('❌ CRON_SECRET not set in Script Properties');
    Logger.log('💡 Go to Project Settings > Script Properties and add it');
  } else {
    Logger.log('✅ CRON_SECRET: [' + cronSecret.length + ' characters]');
  }
  
  // Check Gmail access
  try {
    const testThreads = GmailApp.search('in:inbox', 0, 1);
    Logger.log('✅ Gmail access working (' + testThreads.length + ' threads found)');
  } catch (e) {
    Logger.log('❌ Gmail access error: ' + e.message);
  }
  
  Logger.log('');
  Logger.log('Configuration test complete!');
}

/**
 * Utility: Lists recent HARO emails for debugging
 */
function listRecentHaroEmails() {
  Logger.log('=== RECENT HARO EMAILS ===');
  
  const threads = GmailApp.search('(from:haro@helpareporter.com OR from:haro@helpareporterout.com OR from:help-a-reporter@cisionus.com) newer_than:14d', 0, 10);
  
  Logger.log('Found ' + threads.length + ' HARO emails in last 14 days:');
  
  for (let i = 0; i < threads.length; i++) {
    const message = threads[i].getMessages()[0];
    const subject = message.getSubject();
    const date = message.getDate();
    const hasLabel = message.getThread().getLabels().some(label => label.getName() === 'haro-processed');
    
    Logger.log((i + 1) + '. ' + subject);
    Logger.log('   📅 ' + date + (hasLabel ? ' ✅ processed' : ' 🔄 unprocessed'));
  }
}
