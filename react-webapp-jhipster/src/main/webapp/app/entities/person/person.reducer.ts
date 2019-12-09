import axios from 'axios';
import {
  parseHeaderForLinks,
  loadMoreDataWhenScrolled,
  ICrudGetAction,
  ICrudGetAllAction,
  ICrudPutAction,
  ICrudDeleteAction
} from 'react-jhipster';

import { cleanEntity } from 'app/shared/util/entity-utils';
import { REQUEST, SUCCESS, FAILURE } from 'app/shared/reducers/action-type.util';

import { IPerson, defaultValue } from 'app/shared/model/person.model';

import { EventSourcePolyfill } from 'event-source-polyfill';

import { Storage } from 'react-jhipster';

export const ACTION_TYPES = {
  FETCH_PERSON_LIST: 'person/FETCH_PERSON_LIST',
  FETCH_PERSON: 'person/FETCH_PERSON',
  CREATE_PERSON: 'person/CREATE_PERSON',
  UPDATE_PERSON: 'person/UPDATE_PERSON',
  DELETE_PERSON: 'person/DELETE_PERSON',
  RESET: 'person/RESET'
};

const initialState = {
  loading: false,
  errorMessage: null,
  entities: [] as ReadonlyArray<IPerson>,
  entity: defaultValue,
  links: { next: 0 },
  updating: false,
  totalItems: 0,
  updateSuccess: false
};

export type PersonState = Readonly<typeof initialState>;

// Reducer

export default (state: PersonState = initialState, action): PersonState => {
  console.log(`>>>>>action.type: ${action.type}`);
  console.log(`>>>>>state: ${JSON.stringify(state)}`);
  switch (action.type) {
    case REQUEST(ACTION_TYPES.FETCH_PERSON_LIST):
    case REQUEST(ACTION_TYPES.FETCH_PERSON):
      return {
        ...state,
        errorMessage: null,
        updateSuccess: false,
        loading: true
      };
    case REQUEST(ACTION_TYPES.CREATE_PERSON):
    case REQUEST(ACTION_TYPES.UPDATE_PERSON):
    case REQUEST(ACTION_TYPES.DELETE_PERSON):
      return {
        ...state,
        errorMessage: null,
        updateSuccess: false,
        updating: true
      };
    case FAILURE(ACTION_TYPES.FETCH_PERSON_LIST):
    case FAILURE(ACTION_TYPES.FETCH_PERSON):
    case FAILURE(ACTION_TYPES.CREATE_PERSON):
    case FAILURE(ACTION_TYPES.UPDATE_PERSON):
    case FAILURE(ACTION_TYPES.DELETE_PERSON):
      return {
        ...state,
        loading: false,
        updating: false,
        updateSuccess: false,
        errorMessage: action.payload
      };
    case SUCCESS(ACTION_TYPES.FETCH_PERSON_LIST): {
      const links = parseHeaderForLinks(action.payload.headers.link);
      console.log(`>>>>Links: ${links}`);
      console.log(`>>>>Entities: ${state.entities}`);

      return {
        ...state,
        loading: false,
        links,
        entities: loadMoreDataWhenScrolled(state.entities, action.payload.data, links),
        totalItems: parseInt(action.payload.headers['x-total-count'], 10)
      };
    }
    case SUCCESS(ACTION_TYPES.FETCH_PERSON):
      return {
        ...state,
        loading: false,
        entity: action.payload.data
      };
    case SUCCESS(ACTION_TYPES.CREATE_PERSON):
    case SUCCESS(ACTION_TYPES.UPDATE_PERSON):
      return {
        ...state,
        updating: false,
        updateSuccess: true,
        entity: action.payload.data
      };
    case SUCCESS(ACTION_TYPES.DELETE_PERSON):
      return {
        ...state,
        updating: false,
        updateSuccess: true,
        entity: {}
      };
    case ACTION_TYPES.RESET:
      return {
        ...initialState
      };
    default:
      return state;
  }
};

const apiUrl = 'api/persons';

// Actions

const payload = {
  data: []
};
let eventSource;

export const getEntities: ICrudGetAllAction<IPerson> = (page, size, sort) => {
  if (!eventSource) {
    const requestUrl = `${apiUrl}${sort ? `?page=${page}&size=${size}&sort=${sort}` : ''}`;

    const AUTH_TOKEN_KEY = 'jhi-authenticationToken';

    let jwt = Storage.local.get(AUTH_TOKEN_KEY);

    if (!jwt) {
      jwt = Storage.session.get(AUTH_TOKEN_KEY);
    }

    console.log(`JWT: ${jwt}`);

    eventSource = new EventSourcePolyfill(`${requestUrl}`, {
      headers: {
        'Authorization': 'Bearer ' + jwt
      }
    });

    eventSource.addEventListener("open", result => {
      console.log('EventSource open: ', result);
    });

    eventSource.addEventListener("message", result => {
      const data = JSON.parse(result.data);
      console.log(`Event Source Data: ${JSON.stringify(data)}`);
      payload.data.push(data);
    });

    let isClosed = new Promise(function (resolve, reject) {});

    eventSource.addEventListener("error", err => {
      console.log('EventSource error: ', err);
      eventSource.close();
      isClosed.then(() => "true");
    });
  }

//  const closedEventSource = await isClosed;

//  console.log(`closedEventSource: ${closedEventSource}`);

  console.log(`payload: ${JSON.stringify(payload)}`);

  return {
    type: ACTION_TYPES.FETCH_PERSON_LIST,
    payload: payload
  };

/*
  const requestUrl = `${apiUrl}${sort ? `?page=${page}&size=${size}&sort=${sort}` : ''}`;
  return {
    type: ACTION_TYPES.FETCH_PERSON_LIST,
    payload: axios.get<IPerson>(`${requestUrl}${sort ? '&' : '?'}cacheBuster=${new Date().getTime()}`)
  };
  */
};

export const getEntity: ICrudGetAction<IPerson> = id => {
  const requestUrl = `${apiUrl}/${id}`;
  return {
    type: ACTION_TYPES.FETCH_PERSON,
    payload: axios.get<IPerson>(requestUrl)
  };
};

export const createEntity: ICrudPutAction<IPerson> = entity => async dispatch => {
  const result = await dispatch({
    type: ACTION_TYPES.CREATE_PERSON,
    payload: axios.post(apiUrl, cleanEntity(entity))
  });
  return result;
};

export const updateEntity: ICrudPutAction<IPerson> = entity => async dispatch => {
  const result = await dispatch({
    type: ACTION_TYPES.UPDATE_PERSON,
    payload: axios.put(apiUrl, cleanEntity(entity))
  });
  return result;
};

export const deleteEntity: ICrudDeleteAction<IPerson> = id => async dispatch => {
  const requestUrl = `${apiUrl}/${id}`;
  const result = await dispatch({
    type: ACTION_TYPES.DELETE_PERSON,
    payload: axios.delete(requestUrl)
  });
  return result;
};

export const reset = () => ({
  type: ACTION_TYPES.RESET
});
