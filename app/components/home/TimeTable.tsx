import React from 'react'
import { View, Text } from 'react-native';
import { styles } from '$/style/TimeTable'; // adjust to your actual path
import { TimetableSlotType } from '$/types/timeTable';

// const TimeTable = ({
//   startTime,
//   endTime,
//   isBreak,
//   label,
//   options,
// }: TimetableSlotType) => {
//   if (isBreak) {
//     return (
//       <View style={styles.slotBreak}>
//         <Text style={styles.slotBreakLabel}>{label}</Text>
//         <Text style={styles.slotBreakTime}>
//           {startTime} - {endTime}
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.slotCard}>
//       <View style={styles.slotTime}>
//         <Text style={styles.slotTimeStart}>{startTime}</Text>
//         <Text style={styles.slotTimeEnd}>{endTime}</Text>
//       </View>

//       <View style={styles.slotBody}>
//         {options.length === 0 ? (
//           <Text style={styles.slotFree}>Free period</Text>
//         ) : (
//           options.map((opt, idx) => (
//             <View
//               key={`${opt.subject}-${idx}`}
//               style={idx > 0 ? styles.slotOptionDivider : styles.slotOption}
//             >
//               <Text style={styles.slotSubject}>
//                 {opt.subject}
//                 {opt.language ? ` (${opt.language})` : ''}
//               </Text>
//               {opt.teacher && (
//                 <Text style={styles.slotTeacher}>{opt.teacher}</Text>
//               )}
//             </View>
//           ))
//         )}
//       </View>
//     </View>
//   );
// };

// export default TimeTable;


const isCurrentPeriod = (start: string, end: string) => {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= startMins && nowMins < endMins;
};

const TimeTable = ({
  startTime,
  endTime,
  isBreak,
  label,
  options,
}: TimetableSlotType) => {
  if (isBreak) {
    return (
      <View className="flex-row items-center justify-center bg-gray-100 rounded-xl py-2.5">
        <Text className="text-xs font-semibold text-gray-500 tracking-wide">
          {label}
        </Text>
        <Text className="text-xs text-gray-400 ml-2">
          {startTime} - {endTime}
        </Text>
      </View>
    );
  }

  const active = isCurrentPeriod(startTime, endTime);

  return (
    <View
      className={`flex-row bg-white rounded-2xl p-4 border ${
        active ? 'border-blue-200 bg-blue-50' : 'border-gray-100'
      }`}
    >
      {active && <View className="w-1 rounded-full bg-blue-500 mr-3 -ml-1" />}

      <View className="w-16 justify-center">
        <Text className="text-xs font-medium text-gray-500">{startTime}</Text>
        <Text className="text-xs text-gray-400">{endTime}</Text>
      </View>

      <View className="flex-1 ml-3">
        {options.length === 0 ? (
          <Text className="text-sm italic text-gray-400">Free period</Text>
        ) : (
          options.map((opt, idx) => (
            <View
              key={`${opt.subject}-${idx}`}
              className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-100' : ''}
            >
              <Text className="text-[15px] font-semibold text-gray-900">
                {opt.subject}
                {opt.language ? ` (${opt.language})` : ''}
              </Text>
              {opt.teacher && (
                <Text className="text-[13px] text-gray-500 mt-0.5">
                  {opt.teacher}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {active && (
        <View className="bg-blue-500 rounded-full px-2 py-0.5 self-start">
          <Text className="text-[10px] font-bold text-white">NOW</Text>
        </View>
      )}
    </View>
  );
};

export default TimeTable;