import { getTeamNumber } from '../utils/draftLogic.js';

export function SnakeOrder({ draftOrder, draftedCount }) {
  const currentRoundIndex = Math.floor(draftedCount / Math.max(draftOrder.length, 1));
  const picksMadeInRound = draftedCount % Math.max(draftOrder.length, 1);
  const roundsToShow = [currentRoundIndex, currentRoundIndex + 1, currentRoundIndex + 2];

  return (
    <section className="card sideCard">
      <h3>Snake Draft Order</h3>
      {roundsToShow.map((roundIndex) => {
        const order = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();
        const visibleOrder = roundIndex === currentRoundIndex ? order.slice(picksMadeInRound) : order;

        return (
          <div className="snakeRound" key={roundIndex}>
            <span>Round {roundIndex + 1}</span>
            <div>
              {visibleOrder.map((team) => (
                <b title={team.name} key={`${roundIndex}-${team.id}`}>{getTeamNumber(team) || team.name}</b>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
