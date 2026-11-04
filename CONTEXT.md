# tf2pickup

A pick-up game (PUG) platform for Team Fortress 2: players gather in a queue, ready up, and are launched into a balanced game on a game server.

## Queues

**Queue**:
A place players gather to form one game of a single gamemode, reachable at `/q/<slug>`. An instance can run several.
_Avoid_: lobby (UI term only), pool

**Queue slot**:
One class position in a queue that at most one player occupies.
_Avoid_: seat, spot

**Queue state**:
Where a queue is in its cycle: _waiting_ (filling up), _ready_ (full, players confirming), _launching_ (everyone ready, game being created).

**Ready-up**:
The confirmation each player gives once the queue is full; players who don't ready up in time are kicked.

**Pre-ready**:
A player's standing ready-up, applied automatically the next time a queue they're in fills.

**Queue engine**:
The module that owns a queue's state and every change to its slots, and decides each transition of the queue state.
_Avoid_: queue service, queue manager

**Launch snapshot**:
The frozen contents of a queue at the moment it goes to _launching_: its players and their classes, friend pairs, the winning map.

**Launch mode**:
How a queue turns a full set of players into a game. Only _auto_ (automatic team balancing) exists today.

## Gamemodes

**Gamemode**:
A TF2 competitive format (6v6, 9v9, ultiduo, bball, …) defining the classes and team size. Player skill, elo and stats are kept per gamemode.
_Avoid_: format, game type
