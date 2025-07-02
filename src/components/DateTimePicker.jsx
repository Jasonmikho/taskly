import { useEffect, useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';

export default function MyDateTimePicker({ value, onChange }) {
    const [tempValue, setTempValue] = useState(value); // used for dialog editing

    useEffect(() => {
        setTempValue(value); // sync with external changes
    }, [value]);

    // Prevent AM/PM scroll glitch
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const meridiemList = document.querySelector(
                '[aria-label="Select meridiem"]'
            );
            if (!meridiemList) return;

            meridiemList.scrollTop = 0;

            const items = meridiemList.querySelectorAll('[role="option"]');
            items.forEach((el) => {
                el.scrollIntoView = function () {
                    return;
                };
                el.addEventListener('click', () => {
                    requestAnimationFrame(() => {
                        meridiemList.scrollTop = 0;
                    });
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
                label="Planned date & time"
                value={tempValue}
                onChange={(newVal) => setTempValue(newVal)}
                onAccept={(newVal) => onChange(newVal)} // Commit only on OK
                onClose={() => setTempValue(value)} // Revert if canceled
                enableAccessibleFieldDOMStructure={false}
                slots={{ textField: TextField }}
                slotProps={{
                    textField: {
                        fullWidth: true,
                        required: true,
                        InputProps: value
                            ? {
                                  endAdornment: (
                                      <InputAdornment position="end">
                                          <IconButton
                                              onClick={() => onChange(null)}
                                              aria-label="Clear selected date and time"
                                              edge="end"
                                              size="small"
                                          >
                                              <ClearIcon />
                                          </IconButton>
                                      </InputAdornment>
                                  ),
                              }
                            : {},
                    },
                }}
            />
        </LocalizationProvider>
    );
}
