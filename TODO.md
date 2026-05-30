# Todo items

## Maybe completed

1. [] This doesn't seem like an actual game. It feels more like a simulation of a game placed onto a simple UI. Let's spruce this up by reordering the game page so that it feels more like a game especially thinking about playing this on their phone i.e. vertical orientation smaller screens. Use your best understanding of what browser based games look like to help here. Your cards should feel like yours - you should be able should be able to drag around their cards for ordering. Users should also be able to select multiple cards after draw for purposes of creating books. At the top should be information about the game - which round, whose turn, if it's yours, what action do you need to, I should be able to view the other team's books and how many cards in their hands. We should highlight subtly which cards can form a book or can be a part of an existing book. Etc.

## Completed

1. [x] The landing page needs an improvement. We don't want to make this complex, but the area for setting your user profile information should be at the top where you have two small pencil and recycle icons next to the current name to either specify a name or to create a new automatic one. Below, there should be the active rooms as cards (already done), and then below that, we should have a card to create the room.
2. [x] There's been a regression with the websocket or something. It now takes far more time for everyone to be notified together about someone sitting at the table. It's like there's conflicting state or the websocket can't override the full refresh from tRPC. I don't get it, but it's not a great experience right now.
3. [x] Increase the density of the player cards in the center. It should be as simple as the icon and what team they're on.
4. [x] Users should be able to view historical notifications in a special menu somewhere.
5. [x] Replace the title from "hengames" to something like "HenGames".
6. [x] Use some sort of autogeneration to default a name for folks. We do not want "Anonymous is fine" but instead have something like adjective-animal. So peeking-penguin could be a good example.
7. [x] Going on above with the autogeneration angle, let's include the concept of avatar icons of which we can maybe do some autogeneration algorithim for it (think gravatar or even just use gravatar if you can think of a reasonable way). Users, during their session, should be able to update that icon if they want.
8. [x] Get a favicon that isn't just a white arrow pointing up. Let's generate something easy and small that looks like a playing card.
9. [x] Along with the above, we need to make it far more obvious that when you hit the site for the first time, you become a user with that autogen name and icon (which of course should be set in the room view).
10. [x] I should be able to see the current state of the table more easily. I want a way of viewing what books the other team has.
11. [x] Shrink the size of the "cards" so that it shows suite as an emoji and number, J, Q, K, and a clown emoji for the cards.
12. [x] It should be obvious to everyone which round this is on. Right now, I just don't know.
13. [x] In the current game, the whole game comes to a pause after the first draw 2. I think you're supposed to force the user to discard unless.
14. [x] The lobby starter should have options for the game. For now, just include the option for how many decks should be used with 6 as the default.
15. [x] It should be obvious whether you are going to create a red or black book.
16. [x] I really like the icons chosen for profiles, but we need a bigger library. The way it's shown right now is strange. It'd be better for the player to have to click their icon and get a drop down of all of the various ones.
17. [x] The user's GUID is showing up when announcing the actions they did. It should use their current name.
18. [x] Rooms need to automatically close if there has been no activity in them for 5 minutes.
