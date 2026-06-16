/* eslint-disable camelcase */
const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');

const createCardSpec = `root {
  title string<minlength:3|maxlength:100>
  description? string<maxlength:500>
  slug? string<minlength:5|maxlength:50>
  creator_reference string<length:20>
  links[]? {
    title string<minlength:1|maxlength:100>
    url string<maxlength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<minlength:3|maxlength:100>
      description? string<maxlength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedSpec = validator.parse(createCardSpec);

const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;
const ALPHANUMERIC_PATTERN = /^[a-zA-Z0-9]+$/;

function generateSlugFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

function generateRandomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return suffix;
}

function serializeCard(card) {
  const { _id, __v, ...rest } = card;
  return { id: _id, ...rest };
}

async function createCreatorCard(data) {
  const validated = validator.validate(data, parsedSpec);

  const {
    title,
    description,
    slug: providedSlug,
    creator_reference,
    links,
    service_rates,
    status,
    access_type,
    access_code,
  } = validated;

  const effectiveAccessType = access_type || 'public';

  if (effectiveAccessType === 'private' && !access_code) {
    throwAppError('access_code is required when access_type is private', 'AC01');
  }

  if (effectiveAccessType !== 'private' && access_code) {
    throwAppError('access_code can only be set on private cards', 'AC05');
  }

  if (access_code && !ALPHANUMERIC_PATTERN.test(access_code)) {
    throwAppError('access_code must contain only letters and numbers', 'SPCL_VALIDATION');
  }

  if (links && links.length > 0) {
    links.forEach((link) => {
      if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        throwAppError('Link URL must start with http:// or https://', 'SPCL_VALIDATION');
      }
    });
  }

  if (service_rates) {
    service_rates.rates.forEach((rate) => {
      if (!Number.isInteger(rate.amount)) {
        throwAppError(
          'Rate amount must be a positive integer with no decimal places',
          'SPCL_VALIDATION'
        );
      }
    });
  }

  let finalSlug;

  if (providedSlug) {
    if (!SLUG_PATTERN.test(providedSlug)) {
      throwAppError(
        'Slug must contain only letters, numbers, hyphens, and underscores',
        'SPCL_VALIDATION'
      );
    }

    const existing = await creatorCardRepository.findOne({ query: { slug: providedSlug } });
    if (existing) {
      throwAppError('Slug is already taken', 'SL02');
    }

    finalSlug = providedSlug;
  } else {
    let generatedSlug = generateSlugFromTitle(title);

    if (generatedSlug.length < 5) {
      generatedSlug = `${generatedSlug}-${generateRandomSuffix()}`;
    } else {
      const existing = await creatorCardRepository.findOne({ query: { slug: generatedSlug } });
      if (existing) {
        generatedSlug = `${generatedSlug}-${generateRandomSuffix()}`;
      }
    }

    finalSlug = generatedSlug;
  }

  const cardData = {
    title,
    description: description !== undefined ? description : null,
    slug: finalSlug,
    creator_reference,
    links: links || [],
    service_rates: service_rates || null,
    status,
    access_type: effectiveAccessType,
    access_code: access_code || null,
    deleted: null,
  };

  const createdCard = await creatorCardRepository.create(cardData);

  return serializeCard(createdCard);
}

module.exports = createCreatorCard;
