// import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import IconButton from '@material-ui/core/IconButton';
import AddCircle from '@material-ui/icons/AddCircle';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Fragment } from 'react';
import { convertToSlug } from './LeftNavigation';
import Carousel from 'react-material-ui-carousel';
import { useRouter } from 'next/router';
import { useTheme } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

import {
  useGetFieldValuesByItem,
  useGetFieldsByType,
  useDeleteFieldValue,
} from '@frontend/shared/hooks/field';
import FieldsSkeleton from './FieldsSkeleton';
import ErrorLoading from '../common/ErrorLoading';
import FieldValueForm from './FieldValueForm';
import CRUDMenu from '../common/CRUDMenu';
import Backdrop from '../common/Backdrop';
import { onAlert } from '../../utils/alert';
import FieldValueCard from './FieldValueCard';
// import DeleteIcon from '@material-ui/icons/Delete';
// import EditIcon from '@material-ui/icons/Edit';
import Share from '../share/Share';

const initialState = {
  showForm: false,
  showMenu: null,
  selectedFieldValue: null,
  edit: false,
  expanded: false,
  expandId: '',
  showAddMenu: false,
  addTarget: null,
};

function ItemOneFields({
  field,
  parentId,
  showAuthor = true,
  guest,
  setFieldValueCount,
  toggleLeftNavigation,
}) {
  const { query } = useRouter();
  const [state, setState] = useState(initialState);
  const { attributes, admin } = useSelector(({ auth }: any) => auth);
  const currentUserId = attributes['custom:_id'];
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.down('xs'));

  const deleteCallback = () => {
    setState({ ...state, showMenu: null, selectedFieldValue: null, edit: false });
  };

  const { data, error, loading } = useGetFieldValuesByItem({ parentId, field: field._id });
  const { handleDelete, deleteLoading } = useDeleteFieldValue({
    onAlert,
    parentId,
    field: field._id,
  });

  const formProps = {
    field: field._id,
    parentId: parentId,
    typeId: field.typeId ? field.typeId._id : null,
    typeSlug: field.typeId ? field.typeId.slug : null,
    fieldType: field.fieldType,
    label: field.label,
    onCancel: () => {
      toggleLeftNavigation(false);
      setState(initialState);
    },
  };

  useEffect(() => {
    if (data && data.getFieldValuesByItem) {
      setFieldValueCount(data.getFieldValuesByItem.data.length);
    }
  }, [data]);

  const onClickAdd = () => {
    toggleLeftNavigation(true);
    setState({ ...initialState, showForm: true });
  };

  if (!error && (!data || !data.getFieldValuesByItem)) {
    return <FieldsSkeleton />;
  } else if (error) {
    return <ErrorLoading error={error} />;
  }

  const hasAlreadyAdded =
    data.getFieldValuesByItem.data.filter((v) => v.createdBy._id === currentUserId).length > 0;

  const showAddButton =
    data.getFieldValuesByItem.data.length === 0 ||
    (field.multipleValues &&
      !guest &&
      !state.showForm &&
      (field.oneUserMultipleValues || !hasAlreadyAdded));

  return (
    <div key={field._id}>
      <Menu
        anchorEl={state.addTarget}
        keepMounted
        open={Boolean(state.showAddMenu)}
        onClose={() => setState({ ...state, showAddMenu: false, addTarget: null })}>
        <MenuItem onClick={onClickAdd}>
          <ListItemIcon className="mr-n4">
            <AddCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Add New Value" />
        </MenuItem>
        <MenuItem>
          <ListItemIcon className="mr-n4">
            <Share itemSlug={convertToSlug(field.label)} />
          </ListItemIcon>
          <ListItemText primary="Share" />
        </MenuItem>
      </Menu>
      <Divider />
      <div className="d-flex justify-content-between align-items-center align-content-center">
        <Typography
          style={matches ? { paddingTop: 50 } : {}}
          variant="h5"
          className="d-flex align-items-center link-anchor"
          id={convertToSlug(field.label)}>
          {field.label}
          {/* {showAddButton && (
            <Tooltip title="Add New Value">
              <IconButton
                color="primary"
                onClick={() => setState({ ...initialState, showForm: true })}>
                <AddCircle />
              </IconButton>
            </Tooltip>
          )} */}
        </Typography>
        {showAddButton && (
          <IconButton
            color="primary"
            onClick={(event) =>
              setState({ ...initialState, showAddMenu: true, addTarget: event.currentTarget })
            }>
            <MoreVertIcon />
          </IconButton>
        )}
      </div>
      {state.showForm && <FieldValueForm {...formProps} />}
      {data.getFieldValuesByItem.data.length > 1 ? (
        <Carousel
          // index={parseInt(query.index)}
          NextIcon={
            <img
              style={{ width: 30, transform: 'rotate(180deg)' }}
              src="https://images.zerodown.com//website/foyer/static/images/carousel-arrow.png?tr=w-128,h-128,pr-true,f-auto"
            />
          }
          PrevIcon={
            <img
              style={{ width: 30 }}
              src="https://images.zerodown.com//website/foyer/static/images/carousel-arrow.png?tr=w-128,h-128,pr-true,f-auto"
            />
          }
          navButtonsProps={{
            style: {
              padding: 0,
              backgroundColor: 'inherit',
              width: 30,
              height: 30,
              // marginTop: 15,
            },
          }}
          navButtonsWrapperProps={{
            // Move the buttons to the bottom. Unsetting top here to override default style.
            style: {
              top: 50,
            },
          }}
          fullHeightHover={false}
          autoPlay={false}
          animation="slide"
          navButtonsAlwaysVisible={true}>
          {data.getFieldValuesByItem.data.map((fieldValue, index) => (
            <div className="px-" key={fieldValue._id}>
              {state.selectedFieldValue &&
              state.selectedFieldValue._id === fieldValue._id &&
              state.edit ? (
                <FieldValueForm edit {...formProps} fieldValue={fieldValue} />
              ) : (
                <FieldValueCard
                  index={index}
                  fieldValue={fieldValue}
                  field={field}
                  showAction={currentUserId === fieldValue.createdBy._id || admin}
                  showAuthor={showAuthor || showAddButton}
                  onSelect={(target, fieldValue) =>
                    setState({
                      ...state,
                      showMenu: target,
                      selectedFieldValue: fieldValue,
                    })
                  }
                />
              )}
              <p className="text-center w-100">
                {index + 1}/{data.getFieldValuesByItem.data.length}
              </p>
            </div>
          ))}
        </Carousel>
      ) : (
        data.getFieldValuesByItem.data.map((fieldValue, index) => (
          <Fragment key={fieldValue._id}>
            {state.selectedFieldValue &&
            state.selectedFieldValue._id === fieldValue._id &&
            state.edit ? (
              <FieldValueForm edit {...formProps} fieldValue={fieldValue} />
            ) : (
              <FieldValueCard
                index={index}
                fieldValue={fieldValue}
                field={field}
                showAction={currentUserId === fieldValue.createdBy._id || admin}
                showAuthor={showAuthor || showAddButton}
                onSelect={(target, fieldValue) =>
                  setState({
                    ...state,
                    showMenu: target,
                    selectedFieldValue: fieldValue,
                  })
                }
              />
            )}
          </Fragment>
        ))
      )}
      <CRUDMenu
        show={state.showMenu}
        onClose={() => setState(initialState)}
        onDelete={() => handleDelete(state.selectedFieldValue._id, deleteCallback)}
        onEdit={() => {
          if (field.fieldType === 'contentBuilder') {
            toggleLeftNavigation(true);
          }
          setState({ ...state, edit: true, showMenu: null });
        }}
      />
      <Backdrop open={deleteLoading} />
    </div>
  );
}

interface IProps {
  parentId: string;
  typeId: string;
  showAuthor?: boolean;
  guest?: boolean;
  setFields?: (arg: any) => void;
  setFieldValueCount?: (arg: any, arg2: any) => void;
  pushToAnchor?: () => void;
  toggleLeftNavigation?: (value: boolean) => void;
}

export default function ItemsFieldsMap({
  parentId,
  typeId,
  showAuthor = true,
  guest = false,
  setFields = (arg: any) => {},
  setFieldValueCount = (index: number, value: number) => {},
  pushToAnchor = () => {},
  toggleLeftNavigation,
}: IProps) {
  const { data, loading, error } = useGetFieldsByType({ parentId: typeId });

  useEffect(() => {
    if (data && data.getFieldsByType) {
      setFields(data.getFieldsByType.data);
      pushToAnchor();
    }
  }, [data]);

  if (!error && (!data || !data.getFieldsByType)) {
    return <FieldsSkeleton />;
  } else if (error) {
    return <ErrorLoading error={error} />;
  }

  return (
    <>
      {data.getFieldsByType.data.map((field, index) => (
        <ItemOneFields
          toggleLeftNavigation={(value) => {
            if (toggleLeftNavigation) {
              toggleLeftNavigation(value);
            }
          }}
          parentId={parentId}
          field={field}
          key={field._id}
          showAuthor={showAuthor}
          guest={guest}
          setFieldValueCount={(value) => setFieldValueCount(index, value)}
        />
      ))}
    </>
  );
}
