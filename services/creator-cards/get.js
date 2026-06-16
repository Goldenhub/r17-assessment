/* eslint-disable camelcase */
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');

function serializeCardForRetrieval(card) {
  const { _id, __v, access_code, ...rest } = card;
  return { id: _id, ...rest };
}

async function getCreatorCard(serviceData) {
  const { slug, access_code } = serviceData;
  let result;

  try {
    const card = await creatorCardRepository.findOne({ query: { slug, deleted: null } });

    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    }

    if (card.status === 'draft') {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF02');
    }

    if (card.access_type === 'private') {
      if (!access_code) {
        throwAppError(CreatorCardMessages.CARD_IS_PRIVATE, 'AC03');
      }
      if (access_code !== card.access_code) {
        throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
      }
    }

    result = serializeCardForRetrieval(card);
  } catch (error) {
    appLogger.errorX(error, 'get-creator-card-error');
    throw error;
  }

  return result;
}

module.exports = getCreatorCard;
