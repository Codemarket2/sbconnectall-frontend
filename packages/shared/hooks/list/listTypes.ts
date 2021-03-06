import { useEffect, useState } from 'react';
import * as yup from 'yup';
import { useFormik } from 'formik';
import { v4 as uuid } from 'uuid';
import { useQuery, useMutation } from '@apollo/client';
import { CREATE_LIST_TYPE, UPDATE_LIST_TYPE, DELETE_LIST_TYPE } from '../../graphql/mutation/list';
import { GET_LIST_TYPES, GET_LIST_TYPE_BY_SLUG } from '../../graphql/query/list';
import { IHooksProps } from '../../types/common';
import { fileUpload } from '../../utils/fileUpload';
import { omitTypename } from '../../utils/omitTypename';
import { ADDED_LIST_TYPE, UPDATED_LIST_TYPE } from '../../graphql/subscription/list';
import { compressedFile } from '../../utils/compressFile';
import { parsePayload } from '../section/getSection';

const defaultQueryVariables = { limit: 25, page: 1 };

interface IQueryProps {
  limit?: number;
  page?: number;
}

export function useGetListTypes(queryVariables?: IQueryProps) {
  const [state, setState] = useState({
    search: '',
    showSearch: false,
  });
  const [subscribed, setSubscribed] = useState(false);

  const limit =
    queryVariables && queryVariables.limit ? queryVariables.limit : defaultQueryVariables.limit;
  const page =
    queryVariables && queryVariables.page ? queryVariables.page : defaultQueryVariables.page;

  const { data, error, loading, subscribeToMore } = useQuery(GET_LIST_TYPES, {
    variables: { limit, page, search: state.search },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    let unsubscribe = () => null;
    if (!subscribed) {
      setSubscribed(true);
      unsubscribe = subscribeToMore({
        document: ADDED_LIST_TYPE,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          const newListType = subscriptionData.data.addedListType;
          let isNew = true;
          let newData = prev?.getListTypes?.data?.map((t) => {
            if (t._id === newListType._id) {
              isNew = false;
              return newListType;
            }
            return t;
          });
          if (isNew) {
            newData = [...prev?.getListTypes?.data, newListType];
          }
          return {
            ...prev,
            getListTypes: {
              ...prev.getListTypes,
              data: newData,
            },
          };
        },
      });
    }
    return () => unsubscribe();
  }, []);

  return { data, error, loading, state, setState };
}

export function useGetListTypeBySlug({ slug }: any) {
  const { data, error, loading, subscribeToMore } = useQuery(GET_LIST_TYPE_BY_SLUG, {
    variables: { slug },
  });
  const [subscribed, setSubscribed] = useState(false);
  const [lisType, setListType] = useState(null);

  useEffect(() => {
    if (data && data?.getListTypeBySlug) {
      setListType(parsePayload(data.getListTypeBySlug));
    }
  }, [data]);

  useEffect(() => {
    if (data && data.getListTypeBySlug && !subscribed) {
      setSubscribed(true);
      subscribeToMore({
        document: UPDATED_LIST_TYPE,
        variables: {
          _id: data.getListTypeBySlug?._id,
        },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          const newListType = subscriptionData.data.updatedListType;
          return {
            ...prev,
            getListTypeBySlug: {
              ...prev.getListTypeBySlug,
              ...newListType,
            },
          };
        },
      });
    }
  }, [data]);

  return { data: lisType ? { getListTypeBySlug: lisType } : null, error, loading };
}

const pagesList = [
  'admin',
  'comment',
  'feeds',
  'forms',
  'log',
  'types',
  'user',
  'auth',
  'create-post',
  'my-story',
  'saved',
  'style',
  'style33',
];

const listTypesValidationSchema = yup.object({
  title: yup.string().required('Title is required').min(3).notOneOf(pagesList),
});

interface IListTypesFormValues {
  _id: string;
  edit: boolean;
  title: string;
  description: string;
  slug: string;
}

const listTypesDefaultValue = {
  _id: '',
  edit: false,
  title: '',
  description: '',
  slug: '',
};

interface IProps extends IHooksProps {
  createCallBack?: (slug: string) => void;
  updateCallBack?: (slug: string) => void;
}

export function useCreateListType({ onAlert }: IHooksProps) {
  const [createListTypeMutation, { loading: createLoading }] = useMutation(CREATE_LIST_TYPE);
  const handleCreate = async (createCallback) => {
    try {
      const payload = {
        title: `${uuid()}-${new Date().getTime()}-n-e-w`,
        description: '',
        slug: '',
        media: [],
      };
      const res = await createListTypeMutation({
        variables: payload,
      });
      createCallback(res.data.createListType.slug);
    } catch (error) {
      onAlert('Error', error.message);
    }
  };
  return { handleCreate, createLoading };
}

export function useCRUDListTypes({ onAlert, createCallBack, updateCallBack }: IProps) {
  const [state, setState] = useState({
    showForm: false,
    showCRUDMenu: null,
    selectedListType: null,
    media: [],
    tempMediaFiles: [],
    tempMedia: [],
  });

  const [createListTypeMutation, { loading: createLoading }] = useMutation(CREATE_LIST_TYPE);
  const [updateListTypeMutation, { loading: updateLoading }] = useMutation(UPDATE_LIST_TYPE);

  const formik = useFormik({
    initialValues: listTypesDefaultValue,
    validationSchema: listTypesValidationSchema,
    onSubmit: async (payload: IListTypesFormValues, { setFieldError }) => {
      try {
        const isPage = pagesList.includes(payload.title.toLowerCase());
        if (isPage) {
          return setFieldError('title', 'This title is already taken');
        }
        let newMedia = [];
        let newPayload: any = { ...payload };
        if (state.tempMediaFiles.length > 0) {
          newMedia = await fileUpload(state.tempMediaFiles, '/list-items', compressedFile);
          newMedia = newMedia.map((n, i) => ({ url: n, caption: state.tempMedia[i].caption }));
        }
        let media = [...state.media, ...newMedia];
        media = media.map((m) => JSON.parse(JSON.stringify(m), omitTypename));
        newPayload = { ...newPayload, media };
        if (newPayload.edit) {
          await onUpdate(newPayload);
        } else {
          await onCreate(newPayload);
        }
        formik.handleReset('');
        setState({
          ...state,
          showForm: false,
          showCRUDMenu: null,
          selectedListType: null,
          media: [],
          tempMediaFiles: [],
          tempMedia: [],
        });
      } catch (error) {
        if (error?.message?.includes('duplicate key error')) {
          return setFieldError('slug', 'This slug is already taken');
        }
        onAlert('Error', error.message);
      }
    },
  });

  const onCreate = async (payload) => {
    const res = await createListTypeMutation({
      variables: payload,
    });
    createCallBack(res.data.createListType.slug);
  };

  const onUpdate = async (payload) => {
    const updateInCache = (client, mutationResult) => {
      const data = client.readQuery({
        query: GET_LIST_TYPE_BY_SLUG,
        variables: { slug: mutationResult.data.updateListType.slug },
      });
      const newData = {
        getListTypeBySlug: mutationResult.data.updateListType,
      };
      client.writeQuery({
        query: GET_LIST_TYPE_BY_SLUG,
        variables: { slug: mutationResult.data.updateListType.slug },
        data: newData,
      });
    };
    const res = await updateListTypeMutation({
      variables: payload,
      update: updateInCache,
    });
    updateCallBack(res.data.updateListType.slug);
  };

  const setFormValues = (vType: any) => {
    formik.setFieldValue('edit', true, false);
    formik.setFieldValue('title', vType.title, false);
    formik.setFieldValue('description', vType.description, false);
    formik.setFieldValue('slug', vType.slug, false);
    formik.setFieldValue('_id', vType._id, false);
    setState({
      ...state,
      media: vType.media,
      tempMediaFiles: [],
      tempMedia: [],
    });
  };

  const CRUDLoading = createLoading || updateLoading || formik.isSubmitting;

  return { state, setState, formik, setFormValues, CRUDLoading };
}

export function useDeleteListType({ onAlert }: IHooksProps) {
  const [deleteListTypeMutation, { loading: deleteLoading }] = useMutation(DELETE_LIST_TYPE);
  const handleDelete = async (_id: any, deleteCallBack: any) => {
    try {
      await deleteListTypeMutation({
        variables: { _id },
      });
      deleteCallBack();
    } catch (error) {
      onAlert('Error', error.message);
    }
  };

  return { handleDelete, deleteLoading };
}
