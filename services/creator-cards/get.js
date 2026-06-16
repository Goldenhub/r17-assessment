/* eslint-disable camelcase */
const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');

function serializeCardForRetrieval(card) {
  const { _id, __v, access_code, ...rest } = card;
  return { id: _id, ...rest };
}

async function getCreatorCard(slug, accessCode) {
  const card = await creatorCardRepository.findOne({ query: { slug, deleted: null } });

  if (!card) {
    throwAppError('Creator card not found', 'NF01');
  }

  if (card.status === 'draft') {
    throwAppError('Creator card not found', 'NF02');
  }

  if (card.access_type === 'private') {
    if (!accessCode) {
      throwAppError('This card is private. An access code is required', 'AC03');
    }
    if (accessCode !== card.access_code) {
      throwAppError('Invalid access code', 'AC04');
    }
  }

  return serializeCardForRetrieval(card);
}

module.exports = getCreatorCard;
