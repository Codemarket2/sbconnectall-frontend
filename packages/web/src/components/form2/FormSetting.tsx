import Paper from '@material-ui/core/Paper';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import InputGroup from '../common/InputGroup';
import SelectFormFields from './SelectFormFields';

interface IProps {
  isSection?: boolean;
  settings: any;
  onChange: (val: any) => void;
  formId: any;
}

export default function FormSetting({ formId, settings, onChange, isSection }: IProps): any {
  return (
    <Paper variant="outlined" className="p-2">
      <TextField
        fullWidth
        size="small"
        variant="outlined"
        select
        id="demo-simple-select"
        value={settings?.widgetType ?? 'fullForm'}
        label="Widget type"
        onChange={({ target }) => onChange({ widgetType: target.value })}
      >
        <MenuItem value="fullForm">Full Form</MenuItem>
        <MenuItem value="leaderboard">Leaderboad</MenuItem>
        <MenuItem value="oneField">One field at a time</MenuItem>
        <MenuItem value="button">Button</MenuItem>
        <MenuItem value="displayResponses">Display Responses</MenuItem>
        <MenuItem value="displayVertical">
          Display result on one page in vertical one below the other
        </MenuItem>
        <MenuItem value="selectItem">Select Item</MenuItem>
        {isSection && (
          <MenuItem value="onlyPageOwner">Only page owner can submit response</MenuItem>
        )}
      </TextField>
      {settings?.widgetType === 'leaderboard' && (
        <InputGroup>
          <h3>Leader Board</h3>
          <div>
            <TextField
              className="mr-3"
              value={settings?.minValue}
              onChange={(e) => onChange({ minValue: e.target.value })}
              label="min value"
              variant="outlined"
              size="small"
              type="number"
              error={!settings?.minValue}
              helperText={!settings?.minValue && 'Required'}
            />
            <TextField
              value={settings?.maxValue}
              onChange={(e) => onChange({ maxValue: e.target.value })}
              placeholder="max value"
              variant="outlined"
              size="small"
              type="number"
              error={!settings?.maxValue}
              helperText={!settings?.maxValue && 'Required'}
            />
          </div>
        </InputGroup>
      )}
      {settings?.widgetType === 'button' && (
        <InputGroup>
          <TextField
            fullWidth
            value={settings?.buttonLabel}
            onChange={(e) => onChange({ buttonLabel: e.target.value })}
            label="Button label"
            variant="outlined"
            size="small"
            error={!settings?.buttonLabel}
            helperText={!settings?.buttonLabel && 'Required'}
          />
        </InputGroup>
      )}
      {settings?.widgetType === 'selectItem' && (
        <div className="mt-3">
          <SelectFormFields
            formId={formId}
            value={settings?.selectItemField}
            onChange={(newValue) => onChange({ selectItemField: newValue })}
            error={!settings?.selectItemField}
            helperText={!settings?.selectItemField && 'required'}
          />
        </div>
      )}
      {!(settings?.widgetType === 'onlyPageOwner') && (
        <>
          <InputGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!settings?.authRequired}
                  onChange={({ target }) => onChange({ authRequired: !target.checked })}
                  name="authRequired"
                  color="primary"
                />
              }
              label="Authentication required to submit form"
            />
          </InputGroup>
          <InputGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings?.ViewAuthRequired}
                  onChange={({ target }) => onChange({ ViewAuthRequired: target.checked })}
                  name="authRequired"
                  color="primary"
                />
              }
              label="Authentication required to view form"
            />
          </InputGroup>
        </>
      )}
      <InputGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings?.multipleResponses ?? false}
              onChange={({ target }) => onChange({ multipleResponses: target.checked })}
              name="multipleValues"
              color="primary"
            />
          }
          label="can submit multiple responses"
        />
      </InputGroup>
      <InputGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings?.editResponse ?? false}
              onChange={({ target }) => onChange({ editResponse: target.checked })}
              name="multipleValues"
              color="primary"
            />
          }
          label="Allow user to edit their response"
        />
      </InputGroup>
      <InputGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings?.showFormTitle ?? false}
              onChange={({ target }) => onChange({ showFormTitle: target.checked })}
              name="showFormTitle"
              color="primary"
            />
          }
          label="Show form title"
        />
      </InputGroup>
      <InputGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings?.showResponses ?? false}
              onChange={({ target }) => onChange({ showResponses: target.checked })}
              name="showFormResponses"
              color="primary"
            />
          }
          label="Allow users to view all form responses"
        />
      </InputGroup>
    </Paper>
  );
}
