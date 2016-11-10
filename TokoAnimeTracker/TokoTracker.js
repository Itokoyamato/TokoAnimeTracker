var settings = {MALusername: '', MALpassword: '', HBusername: '', HBpassword: '', listSys: 'hummingbird', quality: '1080'};

var animeList = {byIndex: [], byName: []};
var horribleAnimeList = {byIndex: [], byName: []};
var HorribleEpisodeCountFix = {'bungou stray dogs': 12};

var date = new Date();
var isFirefox = typeof InstallTrigger !== 'undefined';
var console = console;
var chrome = chrome;

document.addEventListener('DOMContentLoaded', initializeExtension);

function trackAnime()
{
	if (settings.listSys == 'MAL')
		getMALList(function(){trackAnimeEpisodes();});
	else
		getHummingbirdList(function(){trackAnimeEpisodes();});
}

function trackAnimeEpisodes()
{
	console.log('Sorting anime list...');
	animeList.byIndex.sort(function (a, b) { var time = {a: a.HorribleScheduleTime.split(':'), b: b.HorribleScheduleTime.split(':')}; return a.HorribleScheduleDay - b.HorribleScheduleDay || time.a[0] - time.b[0] || time.a[1] - time.b[1];});
	console.log('Tracking anime episodes...');
	for (var i = 0; i < animeList.byIndex.length; i++){
		animeList.byName[animeList.byIndex[i].HorribleTitle.toLowerCase()] = animeList.byIndex[i];
		animeList.byName[animeList.byIndex[i].HorribleTitle.toLowerCase()].index = i;
		animeList.byIndex[i].index = i;
		retrieveEpisodes(animeList.byIndex[i], parseInt(animeList.byIndex[i].currentEpisode), animeList.byIndex.length);
	}
}

function getMALList(callback) {
	console.log('Retrieving MAL list...');
	var request = new XMLHttpRequest();
	request.open("GET",  'http://myanimelist.net/malappinfo.php?u=' + settings.MALusername + '&my_status=1&type=anime');
	request.send();
	request.onload = function()
	{
		console.log('Processing list...');
		var result = request.responseXML;
		var MALList = result.getElementsByTagName("anime");
		var animeCount = 0;
		for(var i = 0; i < MALList.length; i++) {
			if (MALList[i].childNodes[14].firstChild.nodeValue != '1')
				continue;
			var currentAnime = {'title': '', 'id': null, 'url': null, 'currentEpisode': null, 'totalEpisodes': null, 'airing': null};

			currentAnime.title = MALList[i].childNodes[1].firstChild.nodeValue;
			currentAnime.title_syn = MALList[i].childNodes[2].firstChild.nodeValue;
			currentAnime.id = MALList[i].childNodes[0].firstChild.nodeValue;
			currentAnime.url = 'http://myanimelist.net/anime/' + MALList[i].childNodes[0].firstChild.nodeValue;
			currentAnime.currentEpisode = MALList[i].childNodes[10].firstChild.nodeValue;
			currentAnime.totalEpisodes = MALList[i].childNodes[4].firstChild.nodeValue;
			currentAnime.start_date = MALList[i].childNodes[6].firstChild.nodeValue;
			currentAnime.image = MALList[i].childNodes[8].firstChild.nodeValue;

			var horribleTitle = getHorribleTitle(currentAnime);
			if (horribleTitle){
				console.log('Found on horriblesubs: ' + horribleTitle);
				if (HorribleEpisodeCountFix[horribleTitle.toLowerCase()]){
					currentAnime.currentEpisode = parseInt(currentAnime.currentEpisode) + HorribleEpisodeCountFix[horribleTitle.toLowerCase()];
					currentAnime.totalEpisodes = parseInt(currentAnime.totalEpisodes) + HorribleEpisodeCountFix[horribleTitle.toLowerCase()];
				}
				currentAnime.HorribleTitle = horribleTitle;
				currentAnime.HorribleScheduleDay = horribleAnimeList.byName[horribleTitle.toLowerCase()].scheduleDay;
				currentAnime.HorribleScheduleTime = horribleAnimeList.byName[horribleTitle.toLowerCase()].scheduleTime;
				currentAnime.episodes = [];
				currentAnime.index = animeCount;
				animeList.byIndex[animeCount] = currentAnime;
				animeCount++;
			}
			else
				console.log('Not found on HorribleSubs: ' + currentAnime.title);
		}
		callback();
	};
}

function getHummingbirdList(callback)
{
	console.log('Retrieving Hummingbird list...');
	var request = new XMLHttpRequest();
	request.open("GET",  'http://hummingbird.me/api/v1/users/' + settings.HBusername + '/library?status=currently-watching');
	request.send();
	request.onload = function()
	{
		console.log('Processing list...');
		var list = JSON.parse(request.response);
		var animeCount = 0;
		for(var i = 0; i < list.length; i++)
		{
			var currentAnime = {'title': '', 'id': null, 'url': null, 'currentEpisode': null, 'totalEpisodes': null, 'airing': null};

			currentAnime.title = list[i].anime.title;
			currentAnime.title_syn = list[i].anime.slug;
			currentAnime.id = list[i].anime.id;
			currentAnime.url = 'https://hummingbird.me/anime/' + list[i].slug;
			currentAnime.currentEpisode = list[i].episodes_watched;
			currentAnime.totalEpisodes = list[i].anime.episode_length;
			currentAnime.start_date = list[i].anime.started_airing;
			currentAnime.image = list[i].anime.cover_image;
			var horribleTitle = getHorribleTitle(currentAnime);

			if (horribleTitle)
			{
				console.log('Found: ' + horribleTitle);
				if (HorribleEpisodeCountFix[horribleTitle.toLowerCase()])
				{
					currentAnime.currentEpisode = parseInt(currentAnime.currentEpisode) + HorribleEpisodeCountFix[horribleTitle.toLowerCase()];
					currentAnime.totalEpisodes = parseInt(currentAnime.totalEpisodes) + HorribleEpisodeCountFix[horribleTitle.toLowerCase()];
				}
				currentAnime.HorribleTitle = horribleTitle;
				currentAnime.HorribleScheduleDay = horribleAnimeList.byName[horribleTitle.toLowerCase()].scheduleDay;
				currentAnime.HorribleScheduleTime = horribleAnimeList.byName[horribleTitle.toLowerCase()].scheduleTime;
				currentAnime.episodes = [];
				currentAnime.index = animeCount;
				animeList.byIndex[animeCount] = currentAnime;
				animeCount++;
			}
			else
				console.log('Not found on HorribleSubs: ' + currentAnime.title);
		}
		callback();
	};
}

function getHorribleTitle(anime)
{
	var title = false;
	var title_split = anime.title.split(' ');
	var title_syns;
	if (settings.listSys == 'MAL')
		title_syns = anime.title_syn.split('; ');
	else
		title_syns = anime.title_syn.split('-');
	var i;
	var j;
	// Check if complete title or synonym is found on horriblesubs
	for (i = 0; (i < title_syns.length && !title); i++) {
		if (horribleAnimeList.byName[anime.title.toLowerCase()]) {
			title = horribleAnimeList.byName[anime.title.toLowerCase()].title;
			break;
		}
		if (horribleAnimeList.byName[title_syns[i].toLowerCase()]) {
			title = horribleAnimeList.byName[title_syns[i].toLowerCase()].title;
			break;
		}
	}
	// Check if title or synonym is contained in a title found on horriblesubs
	for (i = 0; (i < title_syns.length && !title); i++) {
		for (j = 0; (j < horribleAnimeList.byIndex.length && !title); j++){
			if (horribleAnimeList.byIndex[j].title.toLowerCase().includes(anime.title.toLowerCase()) || (title_syns[i] !== '' && horribleAnimeList.byIndex[j].title.toLowerCase().includes(title_syns[i].toLowerCase())) ) {
				title = horribleAnimeList.byIndex[j].title;
				break;
			}
		}
	}
	// Check if first word of title is found in a title on horriblesubs
	for (i = 0; (i < horribleAnimeList.byIndex.length && !title); i++){
		if (horribleAnimeList.byIndex[i].title.toLowerCase().includes(title_split[0].toLowerCase())) {
			title = horribleAnimeList.byIndex[i].title;
			break;
		}
	}
	// Check if first word of synonyms is found in a title on horriblesubs
	for (i = 0; (i < title_syns.length && !title); i++) {
		var title_syn_split = title_syns[i].split(' ');
		for (j = 0; (j < horribleAnimeList.byIndex.length && !title); j++){
			if (title_syn_split[0] !== '' && horribleAnimeList.byIndex[j].title.toLowerCase().includes(title_syn_split[0].toLowerCase())) {
				title = horribleAnimeList.byIndex[j].title;
				break;
			}
		}
	}
	return (title);
}

var retrievedAnimeCount = 1;
function retrieveEpisodes(anime, epCount)
{
	if (anime.totalEpisodes > 0 && epCount > anime.totalEpisodes)
		return;
	var request = new XMLHttpRequest();
	var episodeData;
	request.onload = function()
	{
		var result = request.responseXML;
		if (result){
			var nyaaData = result.childNodes[0].childNodes[0].childNodes[4];
			if (nyaaData && nyaaData.childNodes[2]){
				episodeData = {episodeID: epCount, available: true, data: nyaaData};
				anime.episodes.push(episodeData);
				retrieveEpisodes(anime, epCount + 1);
			}
			else{
				++retrievedAnimeCount;
				episodeData = {episodeID: epCount, available: false};
				anime.episodes.push(episodeData);
			}
			var animeListLength = (settings.listSys == "MAL") ? animeList.byIndex.length + 1 : animeList.byIndex.length;
			if (retrievedAnimeCount == animeListLength){
				console.log('Displaying anime episodes...');
				displayAnimes();
			}
		}
	};

	var count = epCount;
	if (count < 10)
		count = '0' + count.toString();
	request.open("GET",  'https://www.nyaa.se/?page=rss&term=[HorribleSubs]' + anime.HorribleTitle + ' ' + count + '[' + settings.quality + ']');
	request.responseType = "document";
	request.send();
}

function retrieveHorribleSubsSchedule()
{
	console.log('Retrieving horriblesubs schedule...');
	var request = new XMLHttpRequest();
	request.onload = function()
	{
		var result = request.responseXML;
		var weekSchedule = result.getElementsByClassName('weekday');
		var animeCount = 0;
		for (var i = 0; i < 7; i++) {
			var daySchedule = weekSchedule[i].nextElementSibling.getElementsByClassName('schedule-page-show');
			for (var j = 0; j < daySchedule.length; j++) {
				var day = i + 1;
				var time = daySchedule[j].nextElementSibling.innerHTML.split(':');
				var fixedTime = [(parseInt(time[0])+8),time[1]];
				if (fixedTime[0] >= 24){
					fixedTime[0] = fixedTime[0] - 24;
					day++;
				}
				if (fixedTime[0].toString().length == 1)
					fixedTime[0] = '0' + fixedTime[0].toString();
				if (day < 0)
					day = 6 - (day-7);
				if (day > 6)
					day = 0;
				var animeData = {title: daySchedule[j].firstChild.innerHTML, scheduleDay: day, scheduleTime: fixedTime[0] + ':' + fixedTime[1]};
				horribleAnimeList.byIndex[animeCount] = animeData;
				horribleAnimeList.byName[animeData.title.toLowerCase()] = animeData;
				animeCount++;
			}
		}
	};

	request.open("GET",  'http://horriblesubs.info/release-schedule/');
	request.responseType = "document";
	request.send();
}

function displayAnimes()
{
	for (var i = 0; i < animeList.byIndex.length; i++){
		displayEpisodes(animeList.byIndex[i]);
	}
	document.getElementById('content').className = "";
}

var intervals = [];
function displayEpisodes(anime)
{
	anime.episodes.sort(
	function(a, b) {
		return a.episodeID - b.episodeID;
	});
	for (var i = 1; i < anime.episodes.length; i++){
		var downloadOrTime = '<div class="releaseTime"><p class="releaseTime">' + anime.HorribleScheduleTime + '</p></div>';
		var watchedButton = '';
		if (anime.episodes[i].available){
			downloadOrTime = '<button id="' + anime.id + '_' + anime.episodes[i].episodeID + '_download" class="download"><span></span></button>';
			watchedButton = '<button id="' + anime.id + '_' + anime.episodes[i].episodeID + '_watched" class="watched">&#10004;</button>';
		}
		var HTMLcontent = "";
		//var totalEpisodes = (anime.totalEpisodes == '0') ? '-' : anime.totalEpisodes;
		HTMLcontent += '<div id="' + anime.id + '_' + anime.episodes[i].episodeID + '_section" class="animeSection">' + 
								'<div class="anime" id="' + anime.id + '_' + anime.episodes[i].episodeID + '_content">' +
								'<div class="titleBackground" style="background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(' + anime.image + ');background-size: 100%, 100%;background-repeat: no-repeat;background-position-y: -150px;"><p class="title">' + anime.HorribleTitle + '</p></div>' + 
									'<div class="episodeCount"><p class="episodeCount">' +
										'Episode ' + anime.episodes[i].episodeID +
									'</p></div>' +
									downloadOrTime +
									watchedButton +
								'</div>' +
								'<div class="animeInfo">' +
									'<p>Lorem ipsum...</p>' +
									'<button id="' + anime.id + '_decrementer" class="decrement">-</button>' +
									'<button id="' + anime.id + '_incrementer" class="increment">+</button>' +
								'</div>' +
							'</div>';

		if (anime.episodes[i].available){
			document.getElementById('dayContent_-1').innerHTML += HTMLcontent;

			intervals[anime.id + '_' + anime.episodes[i].episodeID] = setInterval(function(anime, i){
				document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_download').addEventListener('click', (function(anime, i)
					{
						return function() {
							var downloadURL = anime.episodes[i].data.childNodes[2].firstChild.nodeValue + '&magnet=1';
							chrome.tabs.create({url: downloadURL, active: false});
							chrome.tabs.query({'url': downloadURL}, function(tab){var delay = setInterval(function(){chrome.tabs.remove(tab[0].id);clearInterval(intervals[delay]);}, 500);intervals[delay] = delay;});
						};
					})(anime, i), false);

				document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_watched').addEventListener('click', (function(anime, i)
					{
						return function() {incrementEpisodeCounter(anime, i);};
					})(anime, i), false);
				clearInterval(intervals[anime.id + '_' + anime.episodes[i].episodeID]);
			}, 1000, anime, i);
		}
		else
			if (anime.episodes[i - 1] && anime.episodes[i - 1].available){
				var lastRel = new Date(anime.episodes[i - 1].data.childNodes[5].firstChild.nodeValue);
				if (date.getDate() == lastRel.getDate() && date.getMonth() == lastRel.getMonth() && date.getFullYear() == lastRel.getFullYear() && anime.HorribleScheduleDay == date.getDay()){
					break;
				}
				else
					document.getElementById('dayContent_' + anime.HorribleScheduleDay).innerHTML += HTMLcontent;
			}
			else
				document.getElementById('dayContent_' + anime.HorribleScheduleDay).innerHTML += HTMLcontent;
	}
}

var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function buildList()
{
	var HTMLContent = 	'<div class="daySection" id="daySection_-1">' +
							'<div class="dayText">' +
								'<p class="dayText">Available</p>' +
								'<button id="settings" class="settings"><p class="settings">&#9881;</p></button>' +
							'</div>' +
							'<div class="dayContent" id="dayContent_-1">' +
							'</div>' + 
						'</div>';
	var prevDay = date.getDay() - 1;
	if (prevDay == -1)
		prevDay = 7;
	HTMLContent += 	'<div class="daySection" id="daySection_' + date.getDay() + '">' +
							'<div class="dayText">' +
								'<p class="dayText">Today</p>' +
							'</div>' +
							'<div class="dayContent" id="dayContent_' + date.getDay() + '">' +
							'</div>' + 
						'</div>';
	for (var i = date.getDay() + 1; i != date.getDay(); i++)
	{
		if (i == 7){
			i = 0;
		}
		if (i == date.getDay())
			break;
		HTMLContent += 	'<div class="daySection" id="daySection_' + i + '">' +
							'<div class="dayText">' +
								'<p class="dayText">' + days[i] + '</p>' +
							'</div>' +
							'<div class="dayContent" id="dayContent_' + i + '">' +
							'</div>' + 
						'</div>';
	}
	document.getElementById('content').innerHTML += HTMLContent;
}

function incrementEpisodeCounter(anime, i)
{
	var epCount = parseInt(anime.currentEpisode) + 1;
	if (HorribleEpisodeCountFix[anime.HorribleTitle.toLowerCase()])
		epCount -= HorribleEpisodeCountFix[anime.HorribleTitle.toLowerCase()];
	if (settings.listSys == 'MAL')
		setMALEpisodeCount(anime, i, epCount);
	else
		setHummingbirdEpisodeCount(anime, i, epCount);
}

function setMALEpisodeCount(anime, i, epCount)
{
	var req = new XMLHttpRequest();
	req.open("POST", 'https://myanimelist.net/includes/ajax.inc.php?t=79');
	req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded; charset=UTF-8');
	req.send('anime_id=' + anime.id + '&ep_val=' + epCount + "&csrf_token=" + settings.token);
	req.onreadystatechange = function ()
		{
			if (req.readyState == 4) {
				if (req.status == 200) {
					animeList.byName[anime.HorribleTitle.toLowerCase()].currentEpisode++;
					document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_content').className = " hideAnime";
					intervals[anime.id + '_' + anime.episodes[i].episodeID + '_hide'] = setInterval(function(){document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_section').remove();clearInterval(intervals[anime.id + '_' + anime.episodes[i].episodeID + '_hide']);}, 500);
				} else if (req.status == 400) {
					console.log('MAL Episode increment: There was an error processing the token.');
				} else {
					console.log('MAL Episode increment: Something else other than 200 was returned.');
				}
			}
		};
}

function setHummingbirdEpisodeCount(anime, i, epCount)
{
	var req = new XMLHttpRequest();
	req.open("POST", 'http://hummingbird.me/api/v1/libraries/' + anime.id);
	req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded; charset=UTF-8');
	req.send('episodes_watched=' + epCount + "&auth_token=" + settings.token);
	req.onreadystatechange = function ()
		{
			if (req.readyState == 4) {
				if (req.status == 201) {
					animeList.byName[anime.HorribleTitle.toLowerCase()].currentEpisode++;
					document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_content').className = " hideAnime";
					intervals[anime.id + '_' + anime.episodes[i].episodeID + '_hide'] = setInterval(function(){document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_section').remove();clearInterval(intervals[anime.id + '_' + anime.episodes[i].episodeID + '_hide']);}, 500);
				} else if (req.status == 401) {
					console.log('Hummingbird Episode increment: Access unauthorized.');
				} else {
					console.log(this.response);
					console.log('Hummingbird Episode increment: An unknown error was returned.');
				}
			}
		};
}

var qualitySelected = "1080";
var listSysSelected = "MAL";
function setupSettings()
{
	setTimeout(function()
	{
		document.getElementById('MALusername').value = settings.MALusername;
		document.getElementById('MALpassword').value = settings.MALpassword;
		document.getElementById('HBusername').value = settings.HBusername;
		document.getElementById('HBpassword').value = settings.HBpassword;
		document.getElementById('quality' + settings.quality).className = "quality p" + settings.quality + " qualitySelected";
		if (settings.listSys == "MAL"){
			document.getElementById('listSysMAL').className = "listSys listSysMAL listSysSelected";
			document.getElementById('listSysHB').className = "listSys listSysHB";
		}
		else{
			document.getElementById('listSysHB').className = "listSys listSysHB listSysSelected";
			document.getElementById('listSysMAL').className = "listSys listSysMAL";
		}
		document.getElementById('listSysMAL').addEventListener('click', function()
			{
				listSysSelected = 'MAL';
				document.getElementById('listSysMAL').className = "listSys listSysMAL listSysSelected";
				document.getElementById('listSysHB').className = "listSys listSysHB";
			}, false);
		document.getElementById('listSysHB').addEventListener('click', function()
			{
				listSysSelected = 'hummingbird';
				document.getElementById('listSysMAL').className = "listSys listSysMAL";
				document.getElementById('listSysHB').className = "listSys listSysHB listSysSelected";
			}, false);
		document.getElementById('quality480').addEventListener('click', function()
			{
				qualitySelected = '480';
				document.getElementById('quality480').className = "quality p480 qualitySelected";
				document.getElementById('quality720').className = "quality p720 ";
				document.getElementById('quality1080').className = "quality p1080";
			}, false);
		document.getElementById('quality720').addEventListener('click', function()
			{
				qualitySelected = '720';
				document.getElementById('quality480').className = "quality p480";
				document.getElementById('quality720').className = "quality p720 qualitySelected";
				document.getElementById('quality1080').className = "quality p1080";
			}, false);
		document.getElementById('quality1080').addEventListener('click', function()
			{
				qualitySelected = '1080';
				document.getElementById('quality480').className = "quality p480";
				document.getElementById('quality720').className = "quality p720 ";
				document.getElementById('quality1080').className = "quality p1080 qualitySelected";
			}, false);
		document.getElementById('save').addEventListener('click', function()
			{
				document.getElementById('popup_settings').className = "popup hide";
				document.getElementById('content').className = "";
				saveSettings();
			}, false);
		document.getElementById('settings').addEventListener('click', function()
			{
				document.getElementById('popup_settings').className = "popup show";
				document.getElementById('content').className = "blur";
			}, false);
	}, 1000);
}

function saveSettings()
{
	settings.quality = qualitySelected;
	settings.listSys = listSysSelected;
	settings.MALusername = document.getElementById('MALusername').value;
	settings.MALpassword = document.getElementById('MALpassword').value;
	settings.HBusername = document.getElementById('HBusername').value;
	settings.HBpassword = document.getElementById('HBpassword').value;
	chrome.storage.local.set(
	{
		listSys: settings.listSys,
		quality: settings.quality,
		MALusername: settings.MALusername,
		MALpassword: settings.MALpassword,
		HBusername: settings.HBusername,
		HBpassword: settings.HBpassword
	});
}

function initializeExtension()
{
	console.log("Extension starting.");
	if (isFirefox)
		document.body.style.width = '460px';
	else
		document.body.style.width = '450px';
	getAccount(function(){
		buildList();
		retrieveHorribleSubsSchedule();
		if (settings.listSys == 'MAL')
			loginToMAL();
		else
			loginToHummingbird();
		trackAnime();
	});
	setupSettings();
	if (settings.MALusername === '' || settings.HBusername === '')
			document.getElementById('popup_settings').className = "popup show";
}

function getAccount(callback)
{
	chrome.storage.local.get(
	{
		listSys: '',
		quality: '',
		MALusername: '',
		MALpassword: '',
		HBusername: '',
		HBpassword: ''
	}, function(items)
	{
		settings.listSys = items.listSys;
		settings.quality = items.quality;
		settings.MALusername = items.MALusername;
		settings.MALpassword = items.MALpassword;
		settings.HBusername = items.HBusername;
		settings.HBpassword = items.HBpassword;
		callback();
	});
}

var loginTry = 0;
function loginToMAL()
{
	loginTry++;
	if (loginTry >= 10)
		return (console.log('MAL login: Could not login after 10 attempt.'));
	var csrf_token_req = new XMLHttpRequest();
	csrf_token_req.onload = function()
	{
		settings.token = this.response.getElementsByName("csrf_token")[0].content;
	};

	csrf_token_req.open("GET", 'http://myanimelist.net/login.php');
	csrf_token_req.responseType = "document";
	csrf_token_req.send();

	intervals.loginWait = setInterval(function()
	{
		var login_req = new XMLHttpRequest();
		login_req.open("POST", 'https://myanimelist.net/login.php?from=%2F');
		login_req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded; charset=UTF-8');
		login_req.send('user_name=' + settings.MALusername + '&password=' + settings.MALpassword + '&cookie=1&sublogin=Login&submit=1&csrf_token=' + settings.token);
		clearInterval(intervals.loginWait);
		login_req.onreadystatechange = function ()
			{
				if (login_req.readyState == 4) {
					if (login_req.status == 200) {
						console.log('MAL login: Succesfully logged in.');
					} else if (login_req.status == 400) {
						console.log('MAL login: There was an error processing the token. Retry in 2sec...');
						loginToMAL();
					} else {
						console.log('MAL login: An unknown error was returned. Retry in 2sec...');
						loginToMAL();
					}
				}
			};
	}, 2000);
}

function loginToHummingbird()
{
	loginTry++;
	if (loginTry >= 10)
		return (console.log('Hummingbird login: Could not login after 10 attempt.'));
	var login_req = new XMLHttpRequest();
	login_req.open("POST", 'http://hummingbird.me/api/v1/users/authenticate');
	login_req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded; charset=UTF-8');
	login_req.send('username=' + settings.HBusername + '&password=' + settings.HBpassword);
	login_req.onreadystatechange = function ()
		{
			if (login_req.readyState == 4) {
				if (login_req.status == 201) {
					settings.token = JSON.parse(login_req.response);
					console.log('Hummingbird login: Succesfully logged in.');
				} else if (login_req.status == 401) {
					console.log(login_req.response);
					console.log('Hummingbird login: Access unauthorized. Retry in 2sec...');
					loginToHummingbird();
				} else {
					console.log(login_req.response);
					console.log('Hummingbird login: An unknown error was returned. Retry in 2sec...');
					loginToHummingbird();
				}
			}
		};
}
