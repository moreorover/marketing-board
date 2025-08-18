import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {useDebounce} from "@/hooks/useDebounce";
import {trpc} from "@/utils/trpc";

export default function usePostcodeLookup(initialPostcode: string) {
	const [postcode, setPostcode] = useState(initialPostcode);
	const debouncedPostcode = useDebounce(postcode);

	const postcodeQuery = useQuery({
		...trpc.postcodes.lookup.queryOptions({ postcode: debouncedPostcode }),
		enabled: !!debouncedPostcode && debouncedPostcode.length >= 5,
		retry: false,
		refetchOnWindowFocus: false,
	});

	return {
		postcode,
		setPostcode,
		isValidating: postcodeQuery.isLoading && postcodeQuery.isFetching,
		postcodeData: postcodeQuery.data,
		postcodeError: postcodeQuery.error,
		isSuccess: !!postcodeQuery.data && !postcodeQuery.error,
		isError: !!postcodeQuery.error,
	};
}
