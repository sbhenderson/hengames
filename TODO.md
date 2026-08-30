# Todo items

## In progress

1. [~] Game page redesign — mobile-first game feel. **Shipped so far:** split `GameTable` into
   `GameHud` / `TableSurface` / `PlayerStrip` / `HandTray`, drag-to-reorder your hand (dnd-kit),
   multi-card selection for melds, subtle book/meld hints (possible-meld, existing-meld,
   wild-helper), compact HUD with round + turn prompt on one line, both teams' melds visible,
   and a horizontally scrollable player strip showing hand/foot counts.
   **Still open:** double-tap-to-discard is discoverable only via the helper text; the
   "Add to meld" buttons only appear once a valid selection exists, so there is no affordance
   hinting they exist; no animation/motion when cards are drawn, melded, or discarded.

## Maybe completed

1. [] This doesn't seem like an actual game. It feels more like a simulation of a game placed onto a simple UI. Let's spruce this up by reordering the game page so that it feels more like a game especially thinking about playing this on their phone i.e. vertical orientation smaller screens. Use your best understanding of what browser based games look like to help here. Your cards should feel like yours - you should be able should be able to drag around their cards for ordering. Users should also be able to select multiple cards after draw for purposes of creating books. At the top should be information about the game - which round, whose turn, if it's yours, what action do you need to, I should be able to view the other team's books and how many cards in their hands. We should highlight subtly which cards can form a book or can be a part of an existing book. Etc.

## Completed

1. [x] Add a second game: a solo "Pyramids" game (Neopets style). Landing page to pick a game, user profile lifted to app level, running high scores and a high-score table.
2. [x] The landing page needs an improvement. We don't want to make this complex, but the area for setting your user profile information should be at the top where you have two small pencil and recycle icons next to the current name to either specify a name or to create a new automatic one. Below, there should be the active rooms as cards (already done), and then below that, we should have a card to create the room.
3. [x] There's been a regression with the websocket or something. It now takes far more time for everyone to be notified together about someone sitting at the table. It's like there's conflicting state or the websocket can't override the full refresh from tRPC. I don't get it, but it's not a great experience right now.
4. [x] Increase the density of the player cards in the center. It should be as simple as the icon and what team they're on.
5. [x] Users should be able to view historical notifications in a special menu somewhere.
6. [x] Replace the title from "hengames" to something like "HenGames".
7. [x] Use some sort of autogeneration to default a name for folks. We do not want "Anonymous is fine" but instead have something like adjective-animal. So peeking-penguin could be a good example.
8. [x] Going on above with the autogeneration angle, let's include the concept of avatar icons of which we can maybe do some autogeneration algorithim for it (think gravatar or even just use gravatar if you can think of a reasonable way). Users, during their session, should be able to update that icon if they want.
9. [x] Get a favicon that isn't just a white arrow pointing up. Let's generate something easy and small that looks like a playing card.
10. [x] Along with the above, we need to make it far more obvious that when you hit the site for the first time, you become a user with that autogen name and icon (which of course should be set in the room view).
11. [x] I should be able to see the current state of the table more easily. I want a way of viewing what books the other team has.
12. [x] Shrink the size of the "cards" so that it shows suite as an emoji and number, J, Q, K, and a clown emoji for the cards.
13. [x] It should be obvious to everyone which round this is on. Right now, I just don't know.
14. [x] In the current game, the whole game comes to a pause after the first draw 2. I think you're supposed to force the user to discard unless.
15. [x] The lobby starter should have options for the game. For now, just include the option for how many decks should be used with 6 as the default.
16. [x] It should be obvious whether you are going to create a red or black book.
17. [x] I really like the icons chosen for profiles, but we need a bigger library. The way it's shown right now is strange. It'd be better for the player to have to click their icon and get a drop down of all of the various ones.
18. [x] The user's GUID is showing up when announcing the actions they did. It should use their current name.
19. [x] Rooms need to automatically close if there has been no activity in them for 5 minutes.
