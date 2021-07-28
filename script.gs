function test() {

  file_info_list = get_files_with_drive_url('https://drive.google.com/drive/u/0/folders/test folder')
  loop_through_rows(file_info_list)

}

// how much is the cameras' clock off by
// const CAMERA_SECONDS_OFFSET = (24 * 60) + 46
const CAMERA_SECONDS_OFFSET = (24 * 60) + 16

// by how much is the timestamps likly to be off by 
const TIMESTAMP_DELAY_BUFFER = 15

const OUTPUT_COLUMN = 4



function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('📺  Videographer Tools')
    .addItem('Assign files to timestamps', 'assign_files_for_timestamps')
    .addToUi()
}


function loop_through_rows(file_info_list) {

  // var sheet = SpreadsheetApp.getActiveSheet()
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Z360")

  // get rows and skip header row
  var data = sheet.getDataRange().getValues().slice(1)

  var row_index = 1
  data.forEach(function (row) {

    row_index++

    if (row[1] == 'EVENT') {
      const row_time_stamp = row[0]

      const videos_for_event = get_video_urls_for_timestamp(row_time_stamp, file_info_list)

      var url_index = 0
      videos_for_event.forEach(function(url){
        sheet.getRange(row_index, OUTPUT_COLUMN + url_index).setValue(url)
        url_index ++
      })
      
    }

    Logger.log(row)
  })

}


function get_video_urls_for_timestamp(event_timestamp, video_info_list) {

  var urls = []

  for (var i = 0; i < video_info_list.length; i++) {

    if (is_timestamp_within_video(event_timestamp, video_info_list[i])) {
      const url_with_time = video_info_list[i].url + '&t=' + time_delta_seconds(event_timestamp, video_info_list[i]).toString() +'s'
      urls.push(url_with_time)
    }

  }
  return urls
}


function time_delta_seconds(event_timestamp, video_info){
  const video_start_time = video_info.created.getTime() / 1000
  const event_time = event_timestamp.getTime() / 1000
  const diff = event_time - video_start_time
  return parseInt(diff)
}


function is_timestamp_within_video(event_timestamp, video_info) {

  const video_start_time = video_info.created.getTime() / 1000
  const video_end_time = video_start_time + video_info.duration

  const event_time = event_timestamp.getTime() / 1000

  const diff = event_time - video_start_time

  if ((event_time >= video_start_time) && (event_time <= video_end_time + TIMESTAMP_DELAY_BUFFER)) {
    return true
  }

  return false
}


function assign_files_for_timestamps() {
  var ui = SpreadsheetApp.getUi()

  var result = ui.prompt(
    'Specifily Google Drive folder with videos: \n\n e.g https://drive.google.com/drive/u/0/folders/1ai46FiBjk_WN3eec3e-MN1adssfsdiuys \n\n',
    ui.ButtonSet.OK_CANCEL)

  if (result.getResponseText()) {
    const folde_url = result.getResponseText()
    var file_info_list = get_files_with_drive_url(folde_url)
    loop_through_rows(file_info_list)


  }

}


function get_files_with_drive_url(url) {

  const url_parts = url.split('/')
  const folder_id = url_parts[url_parts.length - 1]

  var folder = DriveApp.getFolderById(folder_id)

  var file_info_list = []
  var files = folder.getFiles()

  while (files.hasNext()) {
    var file = files.next()

    const file_url = file.getUrl()
    var file_created = file.getLastUpdated() 
    Logger.log(file.getName())
    Logger.log('orginal time, ' + file_created.toString())
    file_created.setSeconds(file_created.getSeconds() + CAMERA_SECONDS_OFFSET)
    Logger.log('new time, '+ file_created.toString())
    const video_duration = get_video_duration(file.getId())

    file_info_list.push({ url: file_url, created: file_created, duration: video_duration })
  }

  console.log('total files count = ' + file_info_list.length.toString())

  return file_info_list
}


function get_video_duration(file_id) {
  var seconds = 100
  var url = "https://www.googleapis.com/drive/v3/files/" +  encodeURIComponent(file_id) + "?fields=videoMediaMetadata&access_token=" + ScriptApp.getOAuthToken()
  var response = JSON.parse(UrlFetchApp.fetch(url))
  if (response.videoMediaMetadata){
   seconds = response.videoMediaMetadata.durationMillis / 1000
  }
  return seconds
}









