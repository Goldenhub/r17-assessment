/* eslint-disable camelcase */
const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');

const deleteCardSpec = `root {
  creator_reference string<length:20>
}`;

const parsedSpec = validator.parse(deleteCardSpec);

function serializeCard(card) {
  const { _id, __v, ...rest } = card;
  return { id: _id, ...rest };
}

async function deleteCreatorCard(serviceData) {
  const { slug } = serviceData;

  validator.validate(serviceData, parsedSpec);

  let result;

  try {
    const card = await creatorCardRepository.findOne({ query: { slug, deleted: null } });

    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    }

    const deletedAt = Date.now();

    await creatorCardRepository.updateOne({
      query: { slug },
      updateValues: { deleted: deletedAt },
    });

    result = serializeCard({ ...card, deleted: deletedAt });
  } catch (error) {
    appLogger.errorX(error, 'delete-creator-card-error');
    throw error;
  }

  return result;
}

module.exports = deleteCreatorCard;
