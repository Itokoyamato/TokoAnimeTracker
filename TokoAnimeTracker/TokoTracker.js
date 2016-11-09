var settings = {username: '', password: '', listSys: 'MAL', quality: '1080p'};

var animeList = {byIndex: [], byName: []};
var horribleAnimeList = {byIndex: [], byName: []};
var HorribleEpisodeCountFix = {'bungou stray dogs': 12};

var date = new Date();
var isFirefox = typeof InstallTrigger !== 'undefined';

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
	animeList.byIndex.sort(function (a, b) { var time = {a: a.HorribleScheduleTime.split(':'), b: b.HorribleScheduleTime.split(':')}; return a.HorribleScheduleDay - b.HorribleScheduleDay || time.a[0] - time.b[0] || time.a[1] - time.b[1];})
	for (var i = 0; i < animeList.byIndex.length; i++){
		animeList.byName[animeList.byIndex[i].HorribleTitle.toLowerCase()] = animeList.byIndex[i];
		animeList.byName[animeList.byIndex[i].HorribleTitle.toLowerCase()].index = i;
		animeList.byIndex[i].index = i;
		retrieveEpisodes(animeList.byIndex[i], parseInt(animeList.byIndex[i].currentEpisode), animeList.byIndex.length);
	}
}

function getMALList(callback) {
	var request = new XMLHttpRequest();
	request.open("GET",  'http://myanimelist.net/malappinfo.php?u=' + settings.username + '&my_status=1&type=anime');
	request.send();
	request.onload = function()
	{
		var result = request.responseXML;
		var MALList = result.getElementsByTagName("anime");
		var animeCount = 0;
		for(var i = 0; i < MALList.length; i++) {
			if (MALList[i].childNodes[14].firstChild.nodeValue != '1')
				continue;
			var currentAnime = {'title': '', 'id': null, 'url': null, 'currentEpisode': null, 'totalEpisodes': null, 'airing': null};

			currentAnime['title'] = MALList[i].childNodes[1].firstChild.nodeValue;
			currentAnime['title_syn'] = MALList[i].childNodes[2].firstChild.nodeValue;
			currentAnime['id'] = MALList[i].childNodes[0].firstChild.nodeValue;
			currentAnime['url'] = 'http://myanimelist.net/anime/' + MALList[i].childNodes[0].firstChild.nodeValue;
			currentAnime['currentEpisode'] = MALList[i].childNodes[10].firstChild.nodeValue;
			currentAnime['totalEpisodes'] = MALList[i].childNodes[4].firstChild.nodeValue;
			currentAnime['start_date'] = MALList[i].childNodes[6].firstChild.nodeValue;
			currentAnime['image'] = MALList[i].childNodes[8].firstChild.nodeValue;

			var horribleTitle = getHorribleTitle(currentAnime);
			if (horribleTitle){
				console.log('Found: ' + horribleTitle);
				if (HorribleEpisodeCountFix[horribleTitle.toLowerCase()]){
					currentAnime['currentEpisode'] = parseInt(currentAnime['currentEpisode']) + HorribleEpisodeCountFix[horribleTitle.toLowerCase()];
					currentAnime['totalEpisodes'] = parseInt(currentAnime['totalEpisodes']) + HorribleEpisodeCountFix[horribleTitle.toLowerCase()];
				}
				currentAnime['HorribleTitle'] = horribleTitle;
				currentAnime['HorribleScheduleDay'] = horribleAnimeList.byName[horribleTitle.toLowerCase()].scheduleDay;
				currentAnime['HorribleScheduleTime'] = horribleAnimeList.byName[horribleTitle.toLowerCase()].scheduleTime;
				currentAnime['episodes'] = [];
				currentAnime['index'] = animeCount;
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
	var request = new XMLHttpRequest();
	request.open("GET",  'http://hummingbird.me/api/v1/users/' + settings.username + '/library?status=currently-watching');
	request.send();
	request.onload = function()
	{
		var list = JSON.parse(request.response);
		var animeCount = 0;
		for(var i = 0; i < list.length; i++)
		{
			var currentAnime = {'title': '', 'id': null, 'url': null, 'currentEpisode': null, 'totalEpisodes': null, 'airing': null};

			currentAnime['title'] = list[i].anime.title;
			currentAnime['title_syn'] = list[i].anime.slug;
			currentAnime['id'] = list[i].anime.id;
			currentAnime['url'] = 'https://hummingbird.me/anime/' + list[i].slug;
			currentAnime['currentEpisode'] = list[i].episodes_watched;
			currentAnime['totalEpisodes'] = list[i].anime.episode_length;
			currentAnime['start_date'] = list[i].anime.started_airing;
			currentAnime['image'] = list[i].anime.cover_image;
			var horribleTitle = getHorribleTitle(currentAnime);

			if (horribleTitle)
			{
				console.log('Found: ' + horribleTitle);
				if (HorribleEpisodeCountFix[horribleTitle.toLowerCase()])
				{
					currentAnime['currentEpisode'] = parseInt(currentAnime['currentEpisode']) + HorribleEpisodeCountFix[horribleTitle.toLowerCase()];
					currentAnime['totalEpisodes'] = parseInt(currentAnime['totalEpisodes']) + HorribleEpisodeCountFix[horribleTitle.toLowerCase()];
				}
				currentAnime['HorribleTitle'] = horribleTitle;
				currentAnime['HorribleScheduleDay'] = horribleAnimeList.byName[horribleTitle.toLowerCase()].scheduleDay;
				currentAnime['HorribleScheduleTime'] = horribleAnimeList.byName[horribleTitle.toLowerCase()].scheduleTime;
				currentAnime['episodes'] = [];
				currentAnime['index'] = animeCount;
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
	if (settings.listSys == 'MAL')
		var title_syns = anime.title_syn.split('; ');
	else
		var title_syns = anime.title_syn.split('-');
	// Check if complete title or synonym is found on horriblesubs
	for (var j = 0; (j < title_syns.length && !title); j++) {
		if (horribleAnimeList.byName[anime.title.toLowerCase()]) {
			title = horribleAnimeList.byName[anime.title.toLowerCase()].title;
			break;
		}
		if (horribleAnimeList.byName[title_syns[j].toLowerCase()]) {
			title = horribleAnimeList.byName[title_syns[j].toLowerCase()].title;
			break;
		}
	}
	// Check if title or synonym is contained in a title found on horriblesubs
	for (var j = 0; (j < title_syns.length && !title); j++) {
		for (var k = 0; (k < horribleAnimeList.byIndex.length && !title); k++){
			if (horribleAnimeList.byIndex[k].title.toLowerCase().includes(anime.title.toLowerCase()) || (title_syns[j] != '' && horribleAnimeList.byIndex[k].title.toLowerCase().includes(title_syns[j].toLowerCase())) ) {
				title = horribleAnimeList.byIndex[k].title;
				break;
			}
		}
	}
	// Check if first word of title is found in a title on horriblesubs
	for (var k = 0; (k < horribleAnimeList.byIndex.length && !title); k++){
		if (horribleAnimeList.byIndex[k].title.toLowerCase().includes(title_split[0].toLowerCase())) {
			title = horribleAnimeList.byIndex[k].title;
			break;
		}
	}
	// Check if first word of synonyms is found in a title on horriblesubs
	for (var j = 0; (j < title_syns.length && !title); j++) {
		var title_syn_split = title_syns[j].split(' ');
		for (var k = 0; (k < horribleAnimeList.byIndex.length && !title); k++){
			if (title_syn_split[0] != '' && horribleAnimeList.byIndex[k].title.toLowerCase().includes(title_syn_split[0].toLowerCase())) {
				title = horribleAnimeList.byIndex[k].title;
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
	request.onload = function()
	{
		var result = request.responseXML;
		if (result){
			var nyaaData = result.childNodes[0].childNodes[0].childNodes[4];
			if (nyaaData && nyaaData.childNodes[2]){
				var episodeData = {episodeID: epCount, available: true, data: nyaaData};
				anime.episodes.push(episodeData);
				retrieveEpisodes(anime, epCount + 1);
			}
			else{
				++retrievedAnimeCount;
				var episodeData = {episodeID: epCount, available: false};
				anime.episodes.push(episodeData);
			}
			var animeListLength = (settings.listSys == "MAL") ? animeList.byIndex.length + 1 : animeList.byIndex.length;
			if (retrievedAnimeCount == animeListLength)
				displayAnimes();
		}
	};

	var count = epCount;
	if (count < 10)
		count = '0' + count.toString();
	request.open("GET",  'https://www.nyaa.se/?page=rss&term=[HorribleSubs]' + anime.HorribleTitle + ' ' + count + '[1080]');
	request.responseType = "document";
	request.send();
}

function retrieveHorribleSubsSchedule()
{
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

function displayList()
{
	var days = document.getElementsByClassName("daySection");
	for (var i = 0; i < days.length; i++)
	{
		if (days[i].innerHTML == "")
			days[i].classList.toggle('hide');
	}
}

function displayAnimes()
{
	for (var i = 0; i < animeList.byIndex.length; i++){
		displayEpisodes(animeList.byIndex[i]);
	}
}

var buttomBuildDelay = [];
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
		var totalEpisodes = (anime['totalEpisodes'] == '0') ? '-' : anime['totalEpisodes'];
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
							chrome.tabs.query({'url': downloadURL}, function(tab){var delay = setInterval(function(){chrome.tabs.remove(tab[0].id);clearInterval(intervals[delay])}, 500);intervals[delay] = delay;});
						};
					})(anime, i), false);

				document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_watched').addEventListener('click', (function(anime, i)
					{
						return function() {incrementEpisodeCounter(anime, i)};
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

function addAnimeToDay(anime, day)
{
	var HTMLcontent = "";
	var totalEpisodes = (anime['totalEpisodes'] == '0') ? '-' : anime['totalEpisodes'];
	HTMLcontent += '<div class="animeSection">' + 
							'<div class="anime" id="' + anime['id'] + '">' + 
							'<p class="title">' + anime['title'] + '</p>' + 
								'<p class="episodeCount">' +
									'Episode ' + anime['currentEpisode'] + '/'+ totalEpisodes +
								'</p>' +
							'</div>' +
							'<div class="animeInfo">' +
								'<p>Lorem ipsum...</p>' +
							'</div>' +
							'<button id="' + anime.id + '_decrementer" class="decrement">-</button>' +
							'<button id="' + anime.id + '_incrementer" class="increment">+</button>' +
						'</div>';
	document.getElementById('dayContent_' + day).innerHTML += HTMLcontent;

	buttomBuildDelay[anime.id] = setInterval(function(){
	document.getElementById(anime.id + '_incrementer').addEventListener('click', (function(anime)
		{
			return function() {incrementEpisodeCounter(anime);};
		})(anime), false);

	document.getElementById(anime.id + '_decrementer').addEventListener('click', (function(anime)
		{
			return function() {decrementEpisodeCounter(anime);};
		})(anime), false);

	document.getElementById(anime.id).addEventListener('click', (function(anime)
		{
			return function() {this.classList.toggle('Active');this.nextElementSibling.classList.toggle('show');};
		})(anime), false);

	clearInterval(buttomBuildDelay[anime.id]);
	}, 2000);

}

var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function buildList()
{
	var HTMLContent = 	'<div class="daySection" id="daySection_-1">' +
							'<div class="dayText">' +
								'<p class="dayText">Available</p>' +
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
	document.body.innerHTML += HTMLContent;
}

function incrementEpisodeCounter(anime, i)
{
	var epCount = parseInt(anime.currentEpisode) + 1;
	if (HorribleEpisodeCountFix[anime.HorribleTitle.toLowerCase()])
		epCount -= HorribleEpisodeCountFix[anime.HorribleTitle.toLowerCase()];
	var req = new XMLHttpRequest();
	req.open("POST", 'https://myanimelist.net/includes/ajax.inc.php?t=79');
	req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded; charset=UTF-8');
	req.send('anime_id=' + anime.id + '&ep_val=' + epCount + "&csrf_token=" + settings.csrf_token);
	req.onreadystatechange = function (e)
					{
						if (req.readyState == 4) {
							if (req.status == 200) {
								animeList.byName[anime.HorribleTitle.toLowerCase()].currentEpisode++;
								document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_content').className = " hide";
								intervals[anime.id + '_' + anime.episodes[i].episodeID + '_hide'] = setInterval(function(){document.getElementById(anime.id + '_' + anime.episodes[i].episodeID + '_section').remove();clearInterval(intervals[anime.id + '_' + anime.episodes[i].episodeID + '_hide']);}, 500)
							} else if (req.status == 400) {
								console.log('MAL Episode increment: There was an error processing the token.')
							} else {
								console.log('MAL Episode increment: Something else other than 200 was returned')
							}
						}
					};
}

function decrementEpisodeCounter(anime)
{
	var req = new XMLHttpRequest();
	req.open("POST", 'https://myanimelist.net/includes/ajax.inc.php?t=79');
	req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded; charset=UTF-8');
	req.send('anime_id=' + anime.id + '&ep_val=' + (parseInt(anime.currentEpisode) - 1) + "&csrf_token=" + settings.csrf_token);
	req.onreadystatechange = function (e)
					{
						if (req.readyState == 4) {
							if (req.status == 200) {
								var totalEpisodes = (anime.totalEpisodes == '0') ? '-' : anime.totalEpisodes;
								anime.currentEpisode--;
								document.getElementById(anime.id).getElementsByClassName('episodeCount')[0].innerHTML = 'Episode ' + anime.currentEpisode + '/'+ totalEpisodes;
							} else if (req.status == 400) {
								console.log('MAL Episode increment: There was an error processing the token.')
							} else {
								console.log('MAL Episode increment: Something else other than 200 was returned')
							}
						}
					};
}

function initializeExtension()
{
	console.log("Extension starting.");
	if (isFirefox)
		document.body.style.width = '460px';
	else
		document.body.style.width = '450px';
	getChromeMALAccount(function(){
		buildList();
		retrieveHorribleSubsSchedule();
		loginToMAL();
		trackAnime();
	});
}

function setChromeMALAccount(login)
{
	chrome.storage.sync.set(
	{
		username: login.username,
		password: login.password
	});
}

function getChromeMALAccount(callback)
{
	chrome.storage.local.get(
	{
		username: '',
		password: ''
	}, function(items)
	{
		settings.username = items.username;
		settings.password = items.password;
		callback();
	});
}

var loginWait
function loginToMAL()
{
	var csrf_token_req = new XMLHttpRequest();
	csrf_token_req.onload = function()
	{
		settings.csrf_token = this.response.getElementsByName("csrf_token")[0].content;
	};

	csrf_token_req.open("GET", 'http://myanimelist.net/login.php');
	csrf_token_req.responseType = "document";
	csrf_token_req.send();

	loginWait = setInterval(function()
	{
		var login_req = new XMLHttpRequest();
		login_req.open("POST", 'https://myanimelist.net/login.php?from=%2F');
		login_req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded; charset=UTF-8');
		login_req.send('user_name=' + settings.username + '&password=' + settings.password + '&cookie=1&sublogin=Login&submit=1&csrf_token=' + settings.csrf_token);
		clearInterval(loginWait);
	}, 2000);
}