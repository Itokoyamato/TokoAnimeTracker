# TokoAnimeTracker
An extension that retrieves your watching list from MyAnimeList/Hummingbird and displays your upcoming/available episodes on horribleSubs, allowing you to download the torrent with just a click.

# Changelog
+ ~~Compatibility with firefox~~
+ ~~Fix today's anime being displayed again after being watched~~
+ ~~Compatibility with Hummingbird~~
+ ~~Setting popup:~~
	+ ~~Select MyAnimeList/Hummingbird list~~
	+ ~~Set account settings~~
	+ ~~Select quality to download~~
+ ~~Fix settings not working on firefox~~
+ ~~Recode the retrieveEpisodes function to avoid matching episodes 08 with [1080] and reduce heavily the amount of requests to nyaa.se~~
+ ~~Reload when settings are saved~~
+ ~~Fix first episode not being displayed~~
# To-Do
+ Info popup:
	+ List of animes found/not found on horriblesubs on first load
	+ Cloudflare protection on horriblesubs: if access denied, propose user to open page in a tab
	+ Notice user when horribleSubs is running a donation drive
+ Anime info section
	+ Display basic anime info and user progress on said anime
	+ Allow user to easily edit his list
	+ Allow user to apply title/episodecount fix manually
+ Polish a few things and work around as many request errors as possible