import { useEffect } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import {
    CRUD_GET_LIST,
    useCheckMinimumRequiredProps,
    useDataProvider,
    useNotify,
    useSafeSetState,
    useVersion,
} from 'react-admin';
import isEqual from 'lodash/isEqual';

const isEmptyList = data =>
    Array.isArray(data)
        ? data.length === 0
        : data &&
          Object.keys(data).length === 0 &&
          data.hasOwnProperty('fetchedAt');

// We need a custom hook as the request URL needs to be returned.
const useQueryWithStore = (query, options, dataSelector, totalSelector) => {
    const { type, resource, payload } = query;
    const data = useSelector(dataSelector);
    const total = useSelector(totalSelector);
    const [state, setState] = useSafeSetState({
        data,
        total,
        error: null,
        loading: true,
        loaded: data !== undefined && !isEmptyList(data),
        url: null,
    });
    if (!isEqual(state.data, data) || state.total !== total) {
        setState(
            Object.assign(Object.assign({}, state), {
                data,
                total,
                loaded: true,
            })
        );
    }
    const dataProvider = useDataProvider();
    useEffect(() => {
        setState(prevState =>
            Object.assign(Object.assign({}, prevState), { loading: true })
        );
        dataProvider[type](resource, payload, options)
            .then(response => {
                // We only care about the dataProvider url response here, because
                // the list data was already passed to the SUCCESS redux reducer.
                setState(prevState =>
                    Object.assign(Object.assign({}, prevState), {
                        error: null,
                        loading: false,
                        loaded: true,
                        url: response.url,
                    })
                );
            })
            .catch(error => {
                setState({
                    error,
                    loading: false,
                    loaded: false,
                });
            });
    }, [JSON.stringify({ query, options })]); // eslint-disable-line
    return state;
};

const useGetList = props => {
    useCheckMinimumRequiredProps(
        'List',
        [
            'basePath',
            'filter',
            'location',
            'paginationCursor',
            'resource',
            'seed',
        ],
        props
    );
    const {
        basePath,
        resource,
        hasCreate,
        paginationCursor,
        filter,
        seed,
    } = props;

    const notify = useNotify();
    const version = useVersion();

    const { total, error, loading, loaded, url } = useQueryWithStore(
        {
            type: 'getList',
            resource,
            payload: {
                seed,
                paginationCursor,
                filter,
            },
        },
        {
            action: CRUD_GET_LIST,
            version,
            onFailure: error =>
                notify(
                    typeof error === 'string'
                        ? error
                        : error.message || 'ra.notification.http_error',
                    'warning'
                ),
        },
        state =>
            state.admin.resources[resource]
                ? state.admin.resources[resource].list.ids
                : null,
        state =>
            state.admin.resources[resource]
                ? state.admin.resources[resource].list.total
                : null
    );
    const data = useSelector(
        state =>
            state.admin.resources[resource]
                ? state.admin.resources[resource].data
                : {},
        shallowEqual
    );
    const ids = useSelector(
        state =>
            state.admin.resources[resource]
                ? state.admin.resources[resource].list.ids
                : [],
        shallowEqual
    );

    const listDataObject = {};
    ids.forEach(key => (listDataObject[key] = data[key]));

    const listDataArray = Object.keys(listDataObject).map(key => {
        return listDataObject[key];
    });

    return {
        basePath,
        data: listDataArray,
        error,
        hasCreate,
        ids,
        loading,
        loaded,
        resource,
        total,
        url,
        version,
    };
};

export default useGetList;
