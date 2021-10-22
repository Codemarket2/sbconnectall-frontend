import { useState, useEffect } from 'react';
import * as yup from 'yup';
import { v4 as uuid } from 'uuid';
import { useFormik } from 'formik';
import { useQuery, useMutation } from '@apollo/client';
import {
  CREATE_LIST_ITEM,
  UPDATE_LIST_ITEM,
  DELETE_LIST_ITEM,
  UPDATE_PUBLISH,
  UPDATE_AUTHENTICATION,
} from '../../graphql/mutation/list';
import { GET_LIST_ITEMS_BY_TYPE, GET_LIST_ITEM_BY_SLUG } from '../../graphql/query/list';
import { IHooksProps } from '../../types/common';
import { fileUpload } from '../../utils/fileUpload';
import { omitTypename } from '../../utils/omitTypename';
import { ADDED_LIST_ITEM, UPDATED_LIST_ITEM } from '../../graphql/subscription/list';
import { updateLikeInCache } from '../like/createLike';
const defaultGetListItems = { limit: 100, page: 1 };

export function useGetListItemsByType({ types = [] }: any) {
  const [state, setState] = useState({
    search: '',
    showSearch: false,
  });
  const { data, error, loading, subscribeToMore } = useQuery(GET_LIST_ITEMS_BY_TYPE, {
    variables: { ...defaultGetListItems, types: types, search: state.search },
    fetchPolicy: 'cache-and-network',
  });

  // console.log('data, loading, error', data, loading, error);

  useEffect(() => {
    subscribeToMore({
      document: ADDED_LIST_ITEM,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newListItem = subscriptionData.data.addedListItem;
        let newData = { ...prev.getListItems };
        if (types[0] === newListItem.addedListItem.types[0]._id) {
          updateLikeInCache(newListItem._id, 1);
          const isUpdated = prev.getListItems._id === newListItem._id;
          newData = isUpdated ? newListItem : newData;
          return {
            ...prev,
            getListItems: {
              ...prev.getListItems,
              data: newData,
            },
          };
        }
      },
    });
  }, [data]);

  // console.log('data, error, loading', data, error, loading);

  return { data, error, loading, state, setState };
}

export function useGetListItemBySlug({ slug }: any) {
  const { data, error, loading, subscribeToMore } = useQuery(GET_LIST_ITEM_BY_SLUG, {
    variables: { slug },
    fetchPolicy: 'cache-and-network',
  });
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    if (data && data.getListItems && !subscribed) {
      subscribeToMore({
        document: UPDATED_LIST_ITEM,
        variables: {
          _id: data.getListItemBySlug._id,
        },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          const newListItem = subscriptionData.data.updatedListItem;
          let newData = { ...prev.getListItemBySlug };
          const isUpdated = prev.getListItemBySlug._id === newListItem._id;
          newData = isUpdated ? newListItem : newData;
          return {
            ...prev,
            getListItemBySlug: {
              ...prev.getListItemBySlug,
              data: newData,
            },
          };
        },
      });
    }
    setSubscribed(true);
  }, [data]);

  return { data, error, loading };
}

const listItemsValidationSchema = yup.object({
  title: yup.string().required('Title is required'),
});

interface IListItemsFormValues {
  _id: string;
  edit: boolean;
  title: string;
  description: string;
  types: [string];
}

const listItemsDefaultValue = {
  _id: '',
  edit: false,
  title: '',
  description: '',
};

interface IProps extends IHooksProps {
  types?: any;
  createCallBack?: (arg: string) => void;
  updateCallBack?: (arg: string) => void;
}

export function useCRUDListItems({ onAlert, types, createCallBack, updateCallBack }: IProps) {
  const [state, setState] = useState({
    showForm: false,
    showCRUDMenu: null,
    selectedListItem: null,
    media: [],
    tempMediaFiles: [],
    tempMedia: [],
  });

  const [createListItemMutation, { loading: createLoading }] = useMutation(CREATE_LIST_ITEM);
  const [updateListItemMutation, { loading: updateLoading }] = useMutation(UPDATE_LIST_ITEM);

  const formik = useFormik({
    initialValues: listItemsDefaultValue,
    validationSchema: listItemsValidationSchema,
    onSubmit: async (payload: IListItemsFormValues) => {
      try {
        let newMedia = [];
        let newPayload: any = { ...payload };
        if (state.tempMediaFiles.length > 0) {
          newMedia = await fileUpload(state.tempMediaFiles, '/list-items');
          newMedia = newMedia.map((n, i) => ({ url: n, caption: state.tempMedia[i].caption }));
        }
        let media = [...state.media, ...newMedia];
        media = media.map((m) => JSON.parse(JSON.stringify(m), omitTypename));
        newPayload = { ...newPayload, media, types };
        if (newPayload.edit) {
          const res = await onUpdate(newPayload);
          // console.log('onUpdate res', res);
          updateCallBack(res.data.updateListItem.slug);
        } else {
          let res = await onCreate(newPayload);
          createCallBack(res.data.createListItem.slug);
        }
      } catch (error) {
        onAlert('Error', error.message);
      }
    },
  });

  const onCreate = async (payload) => {
    // const createInCache = (client, mutationResult) => {
    //   const { getListItems } = client.readQuery({
    //     query: GET_LIST_ITEMS_BY_TYPE,
    //     variables: defaultGetListItems,
    //   });
    //   const newData = {
    //     getListItems: {
    //       ...getListItems,
    //       data: [...getListItems.data, mutationResult.data.createListItem],
    //     },
    //   };
    //   client.writeQuery({
    //     query: GET_LIST_ITEMS_BY_TYPE,
    //     variables: defaultGetListItems,
    //     data: newData,
    //   });
    // };
    return await createListItemMutation({
      variables: payload,
      // update: createInCache,
    });
  };

  const onUpdate = async (payload) => {
    // console.log('onUpdate function');
    const updateInCache = (client, mutationResult) => {
      const res = client.readQuery({
        query: GET_LIST_ITEM_BY_SLUG,
        variables: { slug: mutationResult.data.updateListItem.slug },
      });
      const newData = {
        getListItemBySlug: mutationResult.data.updateListItem,
      };
      client.writeQuery({
        query: GET_LIST_ITEM_BY_SLUG,
        variables: { slug: mutationResult.data.updateListItem.slug },
        data: newData,
      });
    };
    return await updateListItemMutation({
      variables: payload,
      update: updateInCache,
    });
  };

  const setFormValues = (item) => {
    formik.setFieldValue('edit', true, false);
    formik.setFieldValue('title', item.title, false);
    formik.setFieldValue('description', item.description, false);
    formik.setFieldValue('_id', item._id, false);

    setState({
      ...state,
      media: item.media,
      tempMediaFiles: [],
      tempMedia: [],
    });
  };

  const CRUDLoading = createLoading || updateLoading || formik.isSubmitting;

  return { state, setState, formik, setFormValues, CRUDLoading };
}

export function useCreateListItem({ onAlert }: IHooksProps) {
  const [createListItemMutation, { loading: createLoading }] = useMutation(CREATE_LIST_ITEM);
  const handleCreate = async (types, createCallback) => {
    try {
      const payload = {
        types,
        title: `${uuid()}-${new Date().getTime()}-n-e-w`,
        description: '',
        media: [],
      };
      const res = await createListItemMutation({
        variables: payload,
      });
      createCallback(res.data.createListItem.slug);
    } catch (error) {
      onAlert('Error', error.message);
    }
  };
  return { handleCreate, createLoading };
}

export function useUpdatePublish(_id: string, isPublish: boolean) {
  useEffect(() => {
    setPublish(isPublish);
  }, [isPublish]);
  const [publish, setPublish] = useState(isPublish);
  const [updatePublish, { data, loading }] = useMutation(UPDATE_PUBLISH);
  const handleChange = (event) => {
    setPublish(event.target.checked);
    updatePublish({
      variables: { _id, publish },
    });
  };
  console.log({ data });
  return {
    handleChange,
    publish,
    loading,
  };
}
export function useUpdateAuthentication(_id: string, isAuthenticateUser: boolean) {
  useEffect(() => {
    setAuthenticateUser(isAuthenticateUser);
  }, [isAuthenticateUser]);
  const [authenticateUser, setAuthenticateUser] = useState(isAuthenticateUser);
  const [updateAuthentication, { data, loading }] = useMutation(UPDATE_AUTHENTICATION);
  const handleChange = (event) => {
    setAuthenticateUser(event.target.checked);
    updateAuthentication({
      variables: { _id, authenticateUser },
    });
  };
  console.log('authuser', data);
  return {
    handleChange,
    authenticateUser,
    loading,
  };
}

export function useDeleteListItem({ onAlert }: IHooksProps) {
  const [deleteListItemMutation, { loading: deleteLoading }] = useMutation(DELETE_LIST_ITEM);
  const handleDelete = async (_id: any, deleteCallBack: any) => {
    try {
      await deleteListItemMutation({
        variables: { _id },
      });
      deleteCallBack();
    } catch (error) {
      onAlert('Error', error.message);
    }
  };

  return { handleDelete, deleteLoading };
}
