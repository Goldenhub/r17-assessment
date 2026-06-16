/* eslint-disable camelcase */
const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');

const deleteCardSpec = `root {
  creator_reference string<length:20>
}`;

const parsedSpec = validator.parse(deleteCardSpec);

function serializeCard(card) {
  const { _id, __v, ...rest } = card;
  return { id: _id, ...rest };
}

async function deleteCreatorCard(slug, data) {
  validator.validate(data, parsedSpec);

  const card = await creatorCardRepository.findOne({ query: { slug, deleted: null } });

  if (!card) {
    throwAppError('Creator card not found', 'NF01');
  }

  const deletedAt = Date.now();

  await creatorCardRepository.updateOne({
    query: { slug },
    updateValues: { deleted: deletedAt },
  });

  return serializeCard({ ...card, deleted: deletedAt });
}

module.exports = deleteCreatorCard;
