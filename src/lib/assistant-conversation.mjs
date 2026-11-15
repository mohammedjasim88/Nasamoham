/** Only completed, source-backed answers advance the conversation's analytical context. */
export function conversationContext(controls, turns = []) {
 const previous = turns.at(-1)?.plan;
 if (!previous) return controls;
 return {...controls, pointId: previous.locations[0], secondPointId: previous.locations[1],
  metric: previous.metric, start: previous.start, end: previous.end, mode: previous.mode,
  fromConversation: true};
}

export function appendTurn(turns, turn) {
 return [...turns, turn].slice(-6);
}
